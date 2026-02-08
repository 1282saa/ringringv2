import json
import boto3
import re
import base64
import time
import urllib.request
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

# AWS 클라이언트
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
polly = boto3.client('polly', region_name='us-east-1')
transcribe = boto3.client('transcribe', region_name='us-east-1')
translate_client = boto3.client('translate', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
secretsmanager = boto3.client('secretsmanager', region_name='us-east-1')

# ElevenLabs 설정
ELEVENLABS_API_KEY = None  # 캐싱용

def get_elevenlabs_api_key():
    """ElevenLabs API 키를 Secrets Manager에서 가져오기 (캐싱)"""
    global ELEVENLABS_API_KEY
    if ELEVENLABS_API_KEY:
        return ELEVENLABS_API_KEY
    try:
        response = secretsmanager.get_secret_value(SecretId='ElevenLabs/ApiKey')
        ELEVENLABS_API_KEY = response['SecretString']
        return ELEVENLABS_API_KEY
    except Exception as e:
        print(f"Failed to get ElevenLabs API key: {e}")
        return None

# 상수
S3_BUCKET = 'eng-learning-audio'
DYNAMODB_TABLE = 'eng-learning-conversations'
TTL_DAYS = 90

# CORS 헤더 (전역)
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}


# ============================================
# 공통 헬퍼 함수
# ============================================

def get_table():
    """DynamoDB 테이블 객체 반환"""
    return dynamodb.Table(DYNAMODB_TABLE)


def get_ttl():
    """TTL 타임스탬프 계산 (90일 후)"""
    return int((datetime.utcnow() + timedelta(days=TTL_DAYS)).timestamp())


def get_now():
    """현재 한국시간(KST)을 ISO 포맷으로 반환"""
    KST = timezone(timedelta(hours=9))
    return datetime.now(KST).isoformat()


def make_response(status_code, body):
    """표준 API 응답 생성"""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body)
    }


def success_response(data):
    """성공 응답 (200)"""
    return make_response(200, data)


def error_response(message, status_code=400):
    """에러 응답"""
    return make_response(status_code, {'error': message})


def validate_required(body, *fields):
    """필수 필드 검증. 누락된 필드가 있으면 에러 응답 반환, 없으면 None"""
    missing = [f for f in fields if not body.get(f)]
    if missing:
        return error_response(f'{", ".join(missing)} {"is" if len(missing) == 1 else "are"} required')
    return None


def get_user_id(body):
    """userId 또는 deviceId를 가져옴 (Cognito userId 우선)"""
    return body.get('userId') or body.get('deviceId')


# 모델 설정
CLAUDE_MODEL = 'anthropic.claude-3-haiku-20240307-v1:0'

# 시스템 프롬프트 (링글 스타일)
SYSTEM_PROMPT = """You are a friendly English conversation partner on a phone call.

CRITICAL RULES:
1. Keep responses SHORT: 1-2 sentences only
2. ALWAYS end with a simple follow-up question
3. NEVER re-introduce yourself after the first message
4. NEVER say "Hello", "Hi there", or greet again after the conversation has started
5. Focus on the CONTENT of what the user said, not their grammar
6. Be warm and natural, like a friend chatting

Context:
- Accent: {accent}
- Level: {level}
- Topic: {topic}

{conversation_style}

Response style examples:
- "That sounds interesting! What made you choose that career?"
- "Oh nice! Do you do that often?"
- "I see. What do you enjoy most about it?"

Only for the VERY FIRST message: Give a brief, friendly greeting and ask ONE simple question about the topic.
After that: NO greetings, NO introductions, just continue the conversation naturally."""

# 대화 스타일별 추가 프롬프트
CONVERSATION_STYLE_PROMPTS = {
    'teacher': 'You are a patient and encouraging English tutor. Gently correct mistakes when appropriate and provide helpful tips.',
    'friend': 'You are a close friend having a casual chat. Use informal language, be playful, and share relatable experiences.',
    'lover': 'You are a loving and caring partner. Be affectionate, use sweet nicknames occasionally (like "sweetie", "honey", "dear"), show genuine interest in their day, and be supportive and encouraging. Express warmth and care in your responses while still helping them practice English.'
}

# 분석용 프롬프트
ANALYSIS_PROMPT = """Analyze the following English conversation between a student and an AI tutor.
Provide a detailed analysis in JSON format.

Conversation:
{conversation}

Analyze ONLY the student's messages (role: user) and return a JSON object with:

{{
  "cafp_scores": {{
    "complexity": <0-100, vocabulary diversity and sentence structure complexity>,
    "accuracy": <0-100, grammatical correctness>,
    "fluency": <0-100, natural flow and coherence>,
    "pronunciation": <0-100, estimate based on word choice indicating possible pronunciation difficulties>
  }},
  "fillers": {{
    "count": <number of filler words used>,
    "words": [<list of filler words found: um, uh, like, you know, basically, actually, literally, I mean, so, well, etc.>],
    "percentage": <percentage of words that are fillers>
  }},
  "grammar_corrections": [
    {{
      "original": "<original sentence with error>",
      "corrected": "<corrected sentence>",
      "explanation": "<brief explanation in Korean>"
    }}
  ],
  "vocabulary": {{
    "total_words": <total words spoken by student>,
    "unique_words": <unique words count>,
    "advanced_words": [<list of advanced vocabulary used>],
    "suggested_words": [<3-5 advanced words they could have used>]
  }},
  "overall_feedback": "<2-3 sentences of encouraging feedback in Korean>",
  "improvement_tips": [<3 specific tips for improvement in Korean>]
}}

Return ONLY valid JSON, no other text."""


# 액션 → 핸들러 매핑 (딕셔너리 디스패치)
ACTION_HANDLERS = {
    'chat': 'handle_chat',
    'tts': 'handle_tts',
    'stt': 'handle_stt',
    'translate': 'handle_translate',
    'analyze': 'handle_analyze',
    'save_settings': 'handle_save_settings',
    'get_settings': 'handle_get_settings',
    'start_session': 'handle_start_session',
    'end_session': 'handle_end_session',
    'save_message': 'handle_save_message',
    'get_sessions': 'handle_get_sessions',
    'get_session_detail': 'handle_get_session_detail',
    'delete_session': 'handle_delete_session',
    'get_transcribe_url': 'handle_get_transcribe_url',
    # 펫 관련 핸들러
    'upload_pet_image': 'handle_upload_pet_image',
    'save_pet': 'handle_save_pet',
    'get_pet': 'handle_get_pet',
    'delete_pet': 'handle_delete_pet',
    # 커스텀 튜터 핸들러
    'save_custom_tutor': 'handle_save_custom_tutor',
    'get_custom_tutor': 'handle_get_custom_tutor',
    'delete_custom_tutor': 'handle_delete_custom_tutor',
    # 음성 클로닝 핸들러
    'clone_voice': 'handle_clone_voice',
    'tts_custom_voice': 'handle_tts_custom_voice',
    # 사용자 메모리 핸들러
    'save_user_memory': 'handle_save_user_memory',
    'get_user_memory': 'handle_get_user_memory',
    'extract_user_info': 'handle_extract_user_info',
    # 사용량 핸들러
    'get_usage': 'handle_get_usage',
    'increment_usage': 'handle_increment_usage',
}


def lambda_handler(event, context):
    """Main Lambda handler - 딕셔너리 디스패치 패턴"""
    if event.get('httpMethod') == 'OPTIONS':
        return make_response(200, '')

    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'chat')

        handler_name = ACTION_HANDLERS.get(action)
        if handler_name:
            return globals()[handler_name](body)

        return error_response('Invalid action')

    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(str(e), 500)


# ============================================
# 대화/분석 핸들러
# ============================================

def handle_chat(body):
    """AI 대화 처리 (Bedrock Claude Haiku)"""
    messages = body.get('messages', [])
    settings = body.get('settings', {})
    user_id = body.get('userId', '')

    accent_map = {'us': 'American English', 'uk': 'British English', 'au': 'Australian English', 'in': 'Indian English'}
    level_map = {'beginner': 'Beginner (use simple words and short sentences)', 'intermediate': 'Intermediate (normal conversation level)', 'advanced': 'Advanced (use complex vocabulary and idioms)'}
    topic_map = {'business': 'Business and workplace situations', 'daily': 'Daily life and casual conversation', 'travel': 'Travel and tourism', 'interview': 'Job interviews and professional settings'}

    # 대화 스타일 가져오기
    conversation_style = settings.get('conversationStyle', 'teacher')
    style_prompt = CONVERSATION_STYLE_PROMPTS.get(conversation_style, CONVERSATION_STYLE_PROMPTS['teacher'])

    # 사용자 메모리 조회 (이전 대화에서 기억한 정보)
    user_memory_prompt = ""
    if user_id:
        try:
            response = get_table().get_item(
                Key={'PK': f'USER#{user_id}', 'SK': 'MEMORY'}
            )
            memory_item = response.get('Item')
            if memory_item and memory_item.get('memory'):
                memory = memory_item.get('memory')
                memory_parts = []
                if memory.get('name'):
                    memory_parts.append(f"- Name: {memory['name']}")
                if memory.get('job'):
                    memory_parts.append(f"- Job: {memory['job']}")
                if memory.get('company'):
                    memory_parts.append(f"- Company: {memory['company']}")
                if memory.get('hobbies'):
                    memory_parts.append(f"- Hobbies: {', '.join(memory['hobbies'][:5])}")
                if memory.get('location'):
                    memory_parts.append(f"- Location: {memory['location']}")
                if memory.get('family'):
                    memory_parts.append(f"- Family: {memory['family']}")
                if memory.get('recent_events'):
                    memory_parts.append(f"- Recent events: {', '.join(memory['recent_events'][:3])}")
                if memory.get('goals'):
                    memory_parts.append(f"- Goals: {', '.join(memory['goals'][:3])}")
                if memory.get('preferences'):
                    memory_parts.append(f"- Preferences: {', '.join(memory['preferences'][:3])}")

                if memory_parts:
                    user_memory_prompt = f"""

IMPORTANT - You remember these facts about this user from previous conversations:
{chr(10).join(memory_parts)}

Use this information naturally in conversation. For example, ask follow-up questions about their job, reference their hobbies, or ask about recent events they mentioned. This makes the conversation more personal and engaging."""
        except Exception as e:
            print(f"[Chat] Memory load error: {str(e)}")

    system = SYSTEM_PROMPT.format(
        accent=accent_map.get(settings.get('accent', 'us'), 'American English'),
        level=level_map.get(settings.get('level', 'intermediate'), 'Intermediate'),
        topic=topic_map.get(settings.get('topic', 'business'), 'Business'),
        conversation_style=style_prompt
    ) + user_memory_prompt

    claude_messages = [{'role': m.get('role', 'user'), 'content': m.get('content', '')} for m in messages]
    if not claude_messages:
        claude_messages = [{'role': 'user', 'content': "Hello, let's start our English practice session."}]

    response = bedrock.invoke_model(
        modelId=CLAUDE_MODEL,
        contentType='application/json',
        accept='application/json',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 300,
            'system': system,
            'messages': claude_messages
        })
    )

    result = json.loads(response['body'].read())
    return success_response({'message': result['content'][0]['text'], 'role': 'assistant'})


def handle_stt(body):
    """음성→텍스트 변환 (AWS Transcribe)"""
    audio_base64 = body.get('audio', '')
    language = body.get('language', 'en-US')

    if not audio_base64:
        return error_response('No audio data provided')

    try:
        audio_data = base64.b64decode(audio_base64)
        job_name = f"stt-{int(time.time() * 1000)}"
        s3_key = f"audio/{job_name}.webm"

        s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=audio_data, ContentType='audio/webm')

        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': f's3://{S3_BUCKET}/{s3_key}'},
            MediaFormat='webm',
            LanguageCode=language,
            Settings={'ShowSpeakerLabels': False, 'ChannelIdentification': False}
        )

        for _ in range(30):
            status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            job_status = status['TranscriptionJob']['TranscriptionJobStatus']

            if job_status == 'COMPLETED':
                transcript_uri = status['TranscriptionJob']['Transcript']['TranscriptFileUri']
                with urllib.request.urlopen(transcript_uri) as response:
                    transcript_data = json.loads(response.read().decode())

                transcript_text = transcript_data['results']['transcripts'][0]['transcript']
                s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
                transcribe.delete_transcription_job(TranscriptionJobName=job_name)

                return success_response({'transcript': transcript_text, 'success': True})
            elif job_status == 'FAILED':
                raise Exception('Transcription failed')

            time.sleep(1)

        raise Exception('Transcription timeout')

    except Exception as e:
        print(f"STT error: {str(e)}")
        return error_response(str(e), 500)


def handle_tts(body):
    """텍스트→음성 변환 (ElevenLabs)"""
    text = body.get('text', '')
    settings = body.get('settings', {})
    accent = settings.get('accent', 'us')
    gender = settings.get('gender', 'female')
    conversation_style = settings.get('conversationStyle', 'teacher')

    # ElevenLabs 음성 ID 맵핑 (자연스러운 음성)
    # 여성: Rachel(따뜻), Bella(친근), Elli(밝음), Charlotte(부드러움)
    # 남성: Adam(따뜻), Antoni(친근), Josh(차분)
    voice_map = {
        ('us', 'female'): 'EXAVITQu4vr4xnSDxMaL',   # Bella - 친근하고 따뜻
        ('us', 'male'): 'pNInz6obpgDQGcFmaJgB',     # Adam - 따뜻하고 자연스러움
        ('uk', 'female'): 'XB0fDUnXU5powFXDhCwa',   # Charlotte - 영국식 부드러움
        ('uk', 'male'): 'TX3LPaxmHKxFdv7VOQHJ',     # Liam - 영국 남성
        ('au', 'female'): 'EXAVITQu4vr4xnSDxMaL',   # Bella (호주 대체)
        ('au', 'male'): 'pNInz6obpgDQGcFmaJgB',     # Adam (호주 대체)
        ('in', 'female'): 'EXAVITQu4vr4xnSDxMaL',   # Bella (인도 대체)
        ('in', 'male'): 'pNInz6obpgDQGcFmaJgB',     # Adam (인도 대체)
    }

    # 애인 스타일은 더 감성적인 음성 사용
    if conversation_style == 'lover':
        if gender == 'female':
            voice_id = '21m00Tcm4TlvDq8ikWAM'  # Rachel - 따뜻하고 감성적
        else:
            voice_id = 'ErXwobaYiN019PkySvjV'  # Antoni - 부드럽고 따뜻
    else:
        voice_id = voice_map.get((accent, gender), 'EXAVITQu4vr4xnSDxMaL')

    try:
        api_key = get_elevenlabs_api_key()
        if not api_key:
            raise Exception("ElevenLabs API key not found")

        # ElevenLabs API 호출 (v1 text-to-speech)
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }
        data = json.dumps({
            "text": text,
            "model_id": "eleven_multilingual_v2"
        }).encode('utf-8')

        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=30) as response:
            audio_data = response.read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')

        return success_response({
            'audio': audio_base64,
            'contentType': 'audio/mpeg',
            'voice': voice_id,
            'engine': 'elevenlabs'
        })
    except Exception as e:
        print(f"ElevenLabs TTS error: {str(e)}, falling back to Polly")
        # Polly 폴백
        try:
            polly_voice_map = {
                ('us', 'female'): ('Joanna', 'neural'), ('us', 'male'): ('Matthew', 'neural'),
                ('uk', 'female'): ('Amy', 'neural'), ('uk', 'male'): ('Brian', 'neural'),
                ('au', 'female'): ('Nicole', 'standard'), ('au', 'male'): ('Russell', 'standard'),
                ('in', 'female'): ('Aditi', 'standard'), ('in', 'male'): ('Aditi', 'standard'),
            }
            polly_voice_id, engine = polly_voice_map.get((accent, gender), ('Joanna', 'neural'))
            response = polly.synthesize_speech(Text=text, OutputFormat='mp3', VoiceId=polly_voice_id, Engine=engine)
            audio_base64 = base64.b64encode(response['AudioStream'].read()).decode('utf-8')
            return success_response({'audio': audio_base64, 'contentType': 'audio/mpeg', 'voice': polly_voice_id, 'engine': 'polly-fallback'})
        except Exception as polly_error:
            print(f"Polly fallback error: {str(polly_error)}")
            return error_response(str(e), 500)


def handle_translate(body):
    """영어→한국어 번역 (Amazon Translate)"""
    text = body.get('text', '')
    source_lang = body.get('sourceLang', 'en')
    target_lang = body.get('targetLang', 'ko')

    if not text:
        return error_response('No text to translate')

    try:
        response = translate_client.translate_text(
            Text=text,
            SourceLanguageCode=source_lang,
            TargetLanguageCode=target_lang
        )
        return success_response({
            'translation': response['TranslatedText'],
            'sourceLang': source_lang,
            'targetLang': target_lang,
            'success': True
        })
    except Exception as e:
        print(f"Translate error: {str(e)}")
        return error_response(str(e), 500)


def handle_analyze(body):
    """대화 분석 (AI 기반 CAFP 점수, 문법, 필러 분석)"""
    messages = body.get('messages', [])

    if not messages:
        return error_response('No messages to analyze')

    conversation_text = '\n'.join(
        f"{m.get('role', m.get('speaker', 'user'))}: {m.get('content', m.get('en', ''))}"
        for m in messages if m.get('role', m.get('speaker')) in ['user', 'assistant']
    )

    user_text = ' '.join(
        m.get('content', m.get('en', '')) for m in messages if m.get('role', m.get('speaker')) == 'user'
    ).lower()

    filler_words = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'i mean', 'so', 'well', 'kind of', 'sort of']
    found_fillers = [f for filler in filler_words for f in [filler] * len(re.findall(r'\b' + filler + r'\b', user_text))]

    try:
        response = bedrock.invoke_model(
            modelId=CLAUDE_MODEL,
            contentType='application/json',
            accept='application/json',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 1500,
                'messages': [{'role': 'user', 'content': ANALYSIS_PROMPT.format(conversation=conversation_text)}]
            })
        )

        result = json.loads(response['body'].read())
        json_match = re.search(r'\{[\s\S]*\}', result['content'][0]['text'])
        if json_match:
            return success_response({'analysis': json.loads(json_match.group()), 'success': True})
        raise ValueError("No JSON found in response")

    except Exception as e:
        print(f"Analysis error: {str(e)}")
        word_count = len(user_text.split())
        return success_response({
            'analysis': {
                'cafp_scores': {'complexity': 70, 'accuracy': 75, 'fluency': 72, 'pronunciation': 78},
                'fillers': {'count': len(found_fillers), 'words': found_fillers, 'percentage': round(len(found_fillers) / max(word_count, 1) * 100, 1)},
                'grammar_corrections': [],
                'vocabulary': {'total_words': word_count, 'unique_words': len(set(user_text.split())), 'advanced_words': [], 'suggested_words': []},
                'overall_feedback': '대화를 잘 하셨습니다! 계속 연습하시면 더 좋아질 거예요.',
                'improvement_tips': ['더 다양한 어휘를 사용해보세요', '문장을 조금 더 길게 만들어보세요', '필러 단어 사용을 줄여보세요']
            },
            'success': True,
            'fallback': True
        })


# ============================================
# 사용자 설정 핸들러
# ============================================

def handle_save_settings(body):
    """사용자 맞춤설정 저장"""
    device_id = get_user_id(body)
    if not device_id:
        return error_response('userId or deviceId is required')
    settings = body.get('settings', {})

    try:
        now = get_now()
        get_table().put_item(Item={
            'PK': f'DEVICE#{device_id}',
            'SK': 'SETTINGS',
            'type': 'USER_SETTINGS',
            'deviceId': device_id,
            'settings': settings,
            'updatedAt': now,
            'createdAt': now,
            'ttl': get_ttl()
        })
        return success_response({'success': True, 'settings': settings, 'updatedAt': now})
    except Exception as e:
        print(f"Save settings error: {str(e)}")
        return error_response(str(e), 500)


def handle_get_settings(body):
    """사용자 맞춤설정 조회"""
    device_id = get_user_id(body)
    if not device_id:
        return error_response('userId or deviceId is required')

    try:
        response = get_table().get_item(Key={'PK': f'DEVICE#{device_id}', 'SK': 'SETTINGS'})
        item = response.get('Item')

        if item:
            return success_response({'success': True, 'settings': item.get('settings', {}), 'updatedAt': item.get('updatedAt')})
        return success_response({'success': True, 'settings': None, 'message': 'No settings found for this device'})
    except Exception as e:
        print(f"Get settings error: {str(e)}")
        return error_response(str(e), 500)


# ============================================
# 세션 관리 핸들러
# ============================================

def handle_start_session(body):
    """새 대화 세션 시작"""
    device_id = body.get('userId') or body.get('deviceId')
    session_id = body.get('sessionId')

    if not device_id or not session_id:
        return error_response('userId/deviceId and sessionId are required')
    settings = body.get('settings', {})
    tutor_name = body.get('tutorName', 'Gwen')

    try:
        now = get_now()
        get_table().put_item(Item={
            'PK': f'DEVICE#{device_id}',
            'SK': f'SESSION#{now}#{session_id}#META',
            'GSI1PK': f'SESSION#{session_id}',
            'GSI1SK': 'META',
            'type': 'SESSION_META',
            'deviceId': device_id,
            'sessionId': session_id,
            'tutorName': tutor_name,
            'topic': settings.get('topic', 'daily'),
            'accent': settings.get('accent', 'us'),
            'level': settings.get('level', 'intermediate'),
            'gender': settings.get('gender', 'female'),
            'settings': settings,
            'startedAt': now,
            'endedAt': None,
            'duration': 0,
            'turnCount': 0,
            'wordCount': 0,
            'status': 'active',
            'createdAt': now,
            'ttl': get_ttl()
        })
        return success_response({'success': True, 'sessionId': session_id, 'startedAt': now})
    except Exception as e:
        print(f"Start session error: {str(e)}")
        return error_response(str(e), 500)


def handle_end_session(body):
    """세션 종료 및 통계 업데이트 (GSI1로 세션 조회)"""
    device_id = body.get('userId') or body.get('deviceId')
    session_id = body.get('sessionId')

    if not device_id or not session_id:
        return error_response('userId/deviceId and sessionId are required')

    try:
        table = get_table()
        now = get_now()

        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND GSI1SK = :sk',
            ExpressionAttributeValues={':pk': f'SESSION#{session_id}', ':sk': 'META'}
        )

        items = response.get('Items', [])
        if not items:
            return error_response('Session not found', 404)

        session_item = items[0]
        if session_item.get('deviceId') != device_id:
            return error_response('Access denied', 403)

        table.update_item(
            Key={'PK': session_item['PK'], 'SK': session_item['SK']},
            UpdateExpression='SET endedAt = :endedAt, #dur = :duration, turnCount = :turnCount, wordCount = :wordCount, #st = :status',
            ExpressionAttributeNames={'#dur': 'duration', '#st': 'status'},
            ExpressionAttributeValues={
                ':endedAt': now,
                ':duration': body.get('duration', 0),
                ':turnCount': body.get('turnCount', 0),
                ':wordCount': body.get('wordCount', 0),
                ':status': 'completed'
            }
        )
        return success_response({'success': True, 'endedAt': now})
    except Exception as e:
        print(f"End session error: {str(e)}")
        return error_response(str(e), 500)


def handle_save_message(body):
    """대화 메시지 저장"""
    device_id = get_user_id(body)
    session_id = body.get('sessionId')
    if not device_id or not session_id or not body.get('message'):
        return error_response('userId/deviceId, sessionId, and message are required')
    message = body.get('message', {})

    try:
        now = get_now()
        message_id = f'MSG#{now}'

        get_table().put_item(Item={
            'PK': f'DEVICE#{device_id}',
            'SK': f'SESSION#{session_id}#{message_id}',
            'GSI1PK': f'SESSION#{session_id}',
            'GSI1SK': message_id,
            'type': 'MESSAGE',
            'deviceId': device_id,
            'sessionId': session_id,
            'role': message.get('role', 'user'),
            'content': message.get('content', ''),
            'translation': message.get('translation'),
            'turnNumber': message.get('turnNumber', 0),
            'timestamp': now,
            'createdAt': now,
            'ttl': get_ttl()
        })
        return success_response({'success': True, 'messageId': message_id})
    except Exception as e:
        print(f"Save message error: {str(e)}")
        return error_response(str(e), 500)


def handle_get_sessions(body):
    """사용자의 세션 목록 조회 (날짜순 정렬, 페이지네이션 지원)"""
    # userId 또는 deviceId 지원 (userId 우선)
    device_id = body.get('userId') or body.get('deviceId')
    if not device_id:
        return error_response('userId or deviceId is required')
    limit = body.get('limit', 10)
    last_key = body.get('lastKey')

    try:
        table = get_table()
        sessions = []
        current_key = last_key
        max_iterations = 10  # Safety limit to prevent infinite loops

        # Loop until we have enough sessions or no more data
        for _ in range(max_iterations):
            query_params = {
                'KeyConditionExpression': 'PK = :pk AND begins_with(SK, :sk_prefix)',
                'FilterExpression': '#type = :type_meta',
                'ExpressionAttributeNames': {'#type': 'type'},
                'ExpressionAttributeValues': {
                    ':pk': f'DEVICE#{device_id}',
                    ':sk_prefix': 'SESSION#',
                    ':type_meta': 'SESSION_META'
                },
                'Limit': 100,  # Fetch more items per query to find SESSION_META items
                'ScanIndexForward': False
            }

            if current_key:
                query_params['ExclusiveStartKey'] = current_key

            response = table.query(**query_params)

            for item in response.get('Items', []):
                if item.get('type') == 'SESSION_META':
                    sessions.append({
                        'sessionId': item.get('sessionId'),
                        'tutorName': item.get('tutorName'),
                        'topic': item.get('topic', 'daily'),
                        'accent': item.get('accent', 'us'),
                        'level': item.get('level', 'intermediate'),
                        'startedAt': item.get('startedAt'),
                        'endedAt': item.get('endedAt'),
                        'duration': int(item.get('duration', 0)),
                        'turnCount': int(item.get('turnCount', 0)),
                        'wordCount': int(item.get('wordCount', 0)),
                        'status': item.get('status')
                    })
                    if len(sessions) >= limit:
                        break

            current_key = response.get('LastEvaluatedKey')

            # Stop if we have enough sessions or no more data
            if len(sessions) >= limit or not current_key:
                break

        # Sort by startedAt descending (newest first)
        sessions.sort(key=lambda x: x.get('startedAt', ''), reverse=True)
        sessions = sessions[:limit]  # Trim to requested limit

        return success_response({'sessions': sessions, 'lastKey': current_key, 'hasMore': current_key is not None})
    except Exception as e:
        print(f"Get sessions error: {str(e)}")
        return error_response(str(e), 500)


def handle_get_session_detail(body):
    """특정 세션의 상세 정보 조회"""
    device_id = get_user_id(body)
    session_id = body.get('sessionId')
    if not device_id or not session_id:
        return error_response('userId/deviceId and sessionId are required')

    try:
        response = get_table().query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk',
            ExpressionAttributeValues={':pk': f'SESSION#{session_id}'},
            ScanIndexForward=True
        )

        session_meta, messages = None, []
        for item in response.get('Items', []):
            if item.get('type') == 'SESSION_META':
                session_meta = {
                    'sessionId': item.get('sessionId'),
                    'tutorName': item.get('tutorName'),
                    'startedAt': item.get('startedAt'),
                    'endedAt': item.get('endedAt'),
                    'duration': int(item.get('duration', 0)),
                    'turnCount': int(item.get('turnCount', 0)),
                    'wordCount': int(item.get('wordCount', 0)),
                    'status': item.get('status')
                }
            elif item.get('type') == 'MESSAGE':
                messages.append({
                    'role': item.get('role'),
                    'content': item.get('content'),
                    'translation': item.get('translation'),
                    'timestamp': item.get('timestamp'),
                    'turnNumber': int(item.get('turnNumber', 0))
                })

        messages.sort(key=lambda x: x.get('turnNumber', 0))
        return success_response({'session': session_meta, 'messages': messages})
    except Exception as e:
        print(f"Get session detail error: {str(e)}")
        return error_response(str(e), 500)


def handle_delete_session(body):
    """세션 삭제 (GSI1으로 조회 + userId/deviceId 검증)"""
    device_id = get_user_id(body)
    session_id = body.get('sessionId')
    if not device_id or not session_id:
        return error_response('userId/deviceId and sessionId are required')

    try:
        table = get_table()

        # GSI1으로 해당 세션의 모든 아이템 조회 (META + MESSAGEs)
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk',
            ExpressionAttributeValues={':pk': f'SESSION#{session_id}'}
        )

        items = response.get('Items', [])
        if not items:
            return error_response('Session not found', 404)

        # deviceId 검증 (다른 사용자 세션 삭제 방지)
        meta_item = next((item for item in items if item.get('type') == 'SESSION_META'), None)
        if meta_item and meta_item.get('deviceId') != device_id:
            return error_response('Access denied', 403)

        # 모든 관련 아이템 삭제
        with table.batch_writer() as batch:
            for item in items:
                batch.delete_item(Key={'PK': item['PK'], 'SK': item['SK']})

        return success_response({'success': True, 'deletedCount': len(items)})
    except Exception as e:
        print(f"Delete session error: {str(e)}")
        return error_response(str(e), 500)


# ============================================
# 펫 캐릭터 핸들러
# ============================================

def handle_upload_pet_image(body):
    """펫 이미지를 S3에 업로드하고 URL 반환"""
    device_id = body.get('userId') or body.get('deviceId')
    if not device_id or not body.get('image'):
        return error_response('userId/deviceId and image are required')
    image_base64 = body.get('image', '')

    try:
        # Base64 이미지 디코딩 (data:image/jpeg;base64, 부분 제거)
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]

        image_data = base64.b64decode(image_base64)

        # S3에 업로드
        now = get_now()
        s3_key = f"pets/{device_id}/{int(time.time() * 1000)}.jpg"

        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=image_data,
            ContentType='image/jpeg'
        )

        # S3 URL 생성 (get_pet에서 presigned URL로 변환됨)
        image_url = f"https://{S3_BUCKET}.s3.amazonaws.com/{s3_key}"

        return success_response({
            'success': True,
            'imageUrl': image_url,
            's3Key': s3_key,
            'uploadedAt': now
        })
    except Exception as e:
        print(f"Upload pet image error: {str(e)}")
        return error_response(str(e), 500)


def handle_save_pet(body):
    """펫 정보를 DynamoDB에 저장"""
    device_id = body.get('userId') or body.get('deviceId')
    if not device_id:
        return error_response('userId or deviceId is required')
    pet_name = body.get('petName', '나의 반려동물')
    image_url = body.get('imageUrl', '')

    try:
        now = get_now()

        get_table().put_item(Item={
            'PK': f'DEVICE#{device_id}',
            'SK': 'PET',
            'type': 'PET_CHARACTER',
            'deviceId': device_id,
            'petName': pet_name,
            'imageUrl': image_url,
            'updatedAt': now,
            'createdAt': now,
            'ttl': get_ttl()
        })

        return success_response({
            'success': True,
            'pet': {
                'name': pet_name,
                'imageUrl': image_url,
                'updatedAt': now
            }
        })
    except Exception as e:
        print(f"Save pet error: {str(e)}")
        return error_response(str(e), 500)


def handle_get_pet(body):
    """펫 정보를 DynamoDB에서 조회 (presigned URL 생성)"""
    device_id = body.get('userId') or body.get('deviceId')
    if not device_id:
        return error_response('userId or deviceId is required')

    try:
        response = get_table().get_item(
            Key={'PK': f'DEVICE#{device_id}', 'SK': 'PET'}
        )
        item = response.get('Item')

        if item:
            image_url = item.get('imageUrl', '')

            # S3 URL에서 presigned URL 생성 (1시간 유효)
            if image_url and S3_BUCKET in image_url:
                try:
                    # URL에서 S3 key 추출
                    s3_key = image_url.split(f'{S3_BUCKET}.s3.amazonaws.com/')[1]
                    # Presigned URL 생성 (3600초 = 1시간)
                    image_url = s3.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': S3_BUCKET, 'Key': s3_key},
                        ExpiresIn=3600
                    )
                except Exception as presign_error:
                    print(f"Presign URL error: {str(presign_error)}")
                    # 실패 시 원본 URL 유지

            return success_response({
                'success': True,
                'pet': {
                    'name': item.get('petName', '나의 반려동물'),
                    'imageUrl': image_url,
                    'updatedAt': item.get('updatedAt')
                }
            })
        return success_response({
            'success': True,
            'pet': None,
            'message': 'No pet found for this device'
        })
    except Exception as e:
        print(f"Get pet error: {str(e)}")
        return error_response(str(e), 500)


def handle_delete_pet(body):
    """펫 정보와 S3 이미지 삭제"""
    device_id = body.get('userId') or body.get('deviceId')
    if not device_id:
        return error_response('userId or deviceId is required')

    try:
        table = get_table()

        # 먼저 기존 펫 정보 조회
        response = table.get_item(
            Key={'PK': f'DEVICE#{device_id}', 'SK': 'PET'}
        )
        item = response.get('Item')

        if item:
            # S3 이미지 삭제 (이미지 URL에서 키 추출)
            image_url = item.get('imageUrl', '')
            if image_url and S3_BUCKET in image_url:
                try:
                    s3_key = image_url.split(f'{S3_BUCKET}.s3.amazonaws.com/')[1]
                    s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
                except Exception as s3_error:
                    print(f"S3 delete warning: {str(s3_error)}")

            # DynamoDB에서 삭제
            table.delete_item(
                Key={'PK': f'DEVICE#{device_id}', 'SK': 'PET'}
            )

            return success_response({'success': True, 'deleted': True})

        return success_response({'success': True, 'deleted': False, 'message': 'No pet found'})
    except Exception as e:
        print(f"Delete pet error: {str(e)}")
        return error_response(str(e), 500)


# ============================================
# 커스텀 튜터 핸들러
# ============================================

def handle_save_custom_tutor(body):
    """커스텀 튜터 정보를 DynamoDB에 저장"""
    device_id = body.get('userId') or body.get('deviceId')
    if not device_id:
        return error_response('userId or deviceId is required')

    tutor_data = body.get('tutor', {})

    try:
        now = get_now()

        get_table().put_item(Item={
            'PK': f'DEVICE#{device_id}',
            'SK': 'CUSTOM_TUTOR',
            'type': 'CUSTOM_TUTOR',
            'deviceId': device_id,
            'tutorName': tutor_data.get('name', '나만의 튜터'),
            'imageUrl': tutor_data.get('image', ''),
            'conversationStyle': tutor_data.get('conversationStyle', 'teacher'),
            'accent': tutor_data.get('accent', 'us'),
            'gender': tutor_data.get('gender', 'female'),
            'tags': tutor_data.get('tags', []),
            'voiceId': tutor_data.get('voiceId'),
            'updatedAt': now,
            'createdAt': now,
            'ttl': get_ttl()
        })

        return success_response({
            'success': True,
            'tutor': {
                'name': tutor_data.get('name'),
                'imageUrl': tutor_data.get('image'),
                'updatedAt': now
            }
        })
    except Exception as e:
        print(f"Save custom tutor error: {str(e)}")
        return error_response(str(e), 500)


def handle_get_custom_tutor(body):
    """커스텀 튜터 정보를 DynamoDB에서 조회 (presigned URL 생성)"""
    device_id = body.get('userId') or body.get('deviceId')
    if not device_id:
        return error_response('userId or deviceId is required')

    try:
        response = get_table().get_item(
            Key={'PK': f'DEVICE#{device_id}', 'SK': 'CUSTOM_TUTOR'}
        )
        item = response.get('Item')

        if item:
            image_url = item.get('imageUrl', '')

            # S3 URL에서 presigned URL 생성 (1시간 유효)
            if image_url and S3_BUCKET in image_url:
                try:
                    s3_key = image_url.split(f'{S3_BUCKET}.s3.amazonaws.com/')[1]
                    image_url = s3.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': S3_BUCKET, 'Key': s3_key},
                        ExpiresIn=3600
                    )
                except Exception as presign_error:
                    print(f"Presign URL error: {str(presign_error)}")

            return success_response({
                'success': True,
                'tutor': {
                    'id': 'custom-tutor',
                    'name': item.get('tutorName', '나만의 튜터'),
                    'image': image_url,
                    'conversationStyle': item.get('conversationStyle', 'teacher'),
                    'accent': item.get('accent', 'us'),
                    'gender': item.get('gender', 'female'),
                    'genderLabel': '여성' if item.get('gender', 'female') == 'female' else '남성',
                    'tags': item.get('tags', []),
                    'voiceId': item.get('voiceId'),
                    'hasCustomVoice': bool(item.get('voiceId')),
                    'isCustom': True,
                    'updatedAt': item.get('updatedAt')
                }
            })
        return success_response({
            'success': True,
            'tutor': None,
            'message': 'No custom tutor found'
        })
    except Exception as e:
        print(f"Get custom tutor error: {str(e)}")
        return error_response(str(e), 500)


def handle_delete_custom_tutor(body):
    """커스텀 튜터 정보 및 S3 이미지 삭제"""
    device_id = body.get('userId') or body.get('deviceId')
    if not device_id:
        return error_response('userId or deviceId is required')

    try:
        table = get_table()

        # 먼저 기존 튜터 정보 조회
        response = table.get_item(
            Key={'PK': f'DEVICE#{device_id}', 'SK': 'CUSTOM_TUTOR'}
        )
        item = response.get('Item')

        if item:
            # S3 이미지 삭제 (이미지 URL에서 키 추출)
            image_url = item.get('imageUrl', '')
            if image_url and S3_BUCKET in image_url:
                try:
                    s3_key = image_url.split(f'{S3_BUCKET}.s3.amazonaws.com/')[1]
                    # presigned URL 파라미터 제거
                    if '?' in s3_key:
                        s3_key = s3_key.split('?')[0]
                    s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
                except Exception as s3_error:
                    print(f"S3 delete warning: {str(s3_error)}")

            # DynamoDB에서 삭제
            table.delete_item(
                Key={'PK': f'DEVICE#{device_id}', 'SK': 'CUSTOM_TUTOR'}
            )

            return success_response({'success': True, 'deleted': True})

        return success_response({'success': True, 'deleted': False, 'message': 'No custom tutor found'})
    except Exception as e:
        print(f"Delete custom tutor error: {str(e)}")
        return error_response(str(e), 500)


# ============================================
# Transcribe Streaming 핸들러
# ============================================

def handle_get_transcribe_url(body):
    """AWS Transcribe Streaming용 Presigned WebSocket URL 생성"""
    language = body.get('language', 'en-US')
    sample_rate = body.get('sampleRate', 16000)

    try:
        # AWS 자격증명 가져오기 (Lambda 환경에서 자동 제공)
        session = boto3.Session()
        credentials = session.get_credentials()
        access_key = credentials.access_key
        secret_key = credentials.secret_key
        session_token = credentials.token  # Lambda는 임시 자격증명 사용

        region = 'us-east-1'
        service = 'transcribe'
        host = f'transcribestreaming.{region}.amazonaws.com'
        endpoint = f'{host}:8443'

        # 현재 시간 (UTC)
        t = datetime.utcnow()
        amz_date = t.strftime('%Y%m%dT%H%M%SZ')
        date_stamp = t.strftime('%Y%m%d')

        # Credential scope
        credential_scope = f'{date_stamp}/{region}/{service}/aws4_request'
        algorithm = 'AWS4-HMAC-SHA256'

        # 모든 쿼리 파라미터 (알파벳 순서 - X-Amz-* 포함)
        # Presigned URL에서는 서명 파라미터도 canonical querystring에 포함
        all_params = {
            'X-Amz-Algorithm': algorithm,
            'X-Amz-Credential': f'{access_key}/{credential_scope}',
            'X-Amz-Date': amz_date,
            'X-Amz-Expires': '300',
            'X-Amz-SignedHeaders': 'host',
            'language-code': language,
            'media-encoding': 'pcm',
            'sample-rate': str(sample_rate),
        }

        # Security Token 추가 (Lambda 임시 자격증명)
        if session_token:
            all_params['X-Amz-Security-Token'] = session_token

        # Canonical Query String (알파벳 순서, 서명 제외)
        canonical_querystring = '&'.join([
            f'{quote(k, safe="")}={quote(str(v), safe="")}'
            for k, v in sorted(all_params.items())
        ])

        # Canonical Headers
        canonical_headers = f'host:{endpoint}\n'
        signed_headers = 'host'

        # Payload Hash (빈 문자열의 SHA256)
        payload_hash = hashlib.sha256(b'').hexdigest()

        # Canonical Request
        canonical_request = '\n'.join([
            'GET',
            '/stream-transcription-websocket',
            canonical_querystring,
            canonical_headers,
            signed_headers,
            payload_hash
        ])

        # String to Sign
        string_to_sign = '\n'.join([
            algorithm,
            amz_date,
            credential_scope,
            hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
        ])

        # Signing Key 생성
        def sign(key, msg):
            return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

        k_date = sign(('AWS4' + secret_key).encode('utf-8'), date_stamp)
        k_region = sign(k_date, region)
        k_service = sign(k_region, service)
        k_signing = sign(k_service, 'aws4_request')

        # Signature 계산
        signature = hmac.new(k_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

        # 최종 URL 생성 (서명 추가)
        signed_url = (
            f'wss://{endpoint}/stream-transcription-websocket'
            f'?{canonical_querystring}'
            f'&X-Amz-Signature={signature}'
        )

        return success_response({
            'url': signed_url,
            'region': region,
            'language': language,
            'sampleRate': sample_rate,
            'expiresIn': 300
        })

    except Exception as e:
        print(f"Get transcribe URL error: {str(e)}")
        return error_response(str(e), 500)


# ============================================
# 음성 클로닝 핸들러 (ElevenLabs)
# ============================================

def handle_clone_voice(body):
    """사용자 음성을 ElevenLabs에 업로드하여 음성 클로닝"""
    validation_error = validate_required(body, 'userId', 'audio', 'voiceName')
    if validation_error:
        return validation_error

    user_id = body.get('userId')
    audio_base64 = body.get('audio', '')
    voice_name = body.get('voiceName', 'Custom Voice')

    try:
        api_key = get_elevenlabs_api_key()
        if not api_key:
            raise Exception("ElevenLabs API key not found")

        # Base64 오디오 디코딩
        if ',' in audio_base64:
            audio_base64 = audio_base64.split(',')[1]

        audio_data = base64.b64decode(audio_base64)

        print(f"[CloneVoice] Audio size: {len(audio_data)} bytes, user: {user_id[:8]}")

        # 오디오를 임시 S3에 저장
        now = get_now()
        s3_key = f"voice-samples/{user_id}/{int(time.time() * 1000)}.webm"

        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=audio_data,
            ContentType='audio/webm'
        )

        # ElevenLabs Add Voice API 호출
        # 올바른 multipart/form-data 형식
        import uuid
        boundary = f'----WebKitFormBoundary{uuid.uuid4().hex[:16]}'

        # 고유한 음성 이름 생성
        unique_voice_name = f'{voice_name}_{user_id[:8]}_{int(time.time())}'

        # multipart body 구성
        body_parts = []

        # name 필드
        body_parts.append(f'--{boundary}')
        body_parts.append('Content-Disposition: form-data; name="name"')
        body_parts.append('')
        body_parts.append(unique_voice_name)

        # files 필드 (바이너리 데이터는 별도 처리)
        body_parts.append(f'--{boundary}')
        body_parts.append('Content-Disposition: form-data; name="files"; filename="voice_sample.mp3"')
        body_parts.append('Content-Type: audio/mpeg')
        body_parts.append('')

        # 텍스트 파트를 CRLF로 연결
        text_part = '\r\n'.join(body_parts) + '\r\n'

        # 바이너리 데이터와 종료 boundary
        end_part = f'\r\n--{boundary}--\r\n'

        # 전체 body 조합
        full_body = text_part.encode('utf-8') + audio_data + end_part.encode('utf-8')

        url = "https://api.elevenlabs.io/v1/voices/add"
        headers = {
            "Accept": "application/json",
            "xi-api-key": api_key,
            "Content-Type": f"multipart/form-data; boundary={boundary}"
        }

        req = urllib.request.Request(url, data=full_body, headers=headers, method='POST')

        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
            voice_id = result.get('voice_id')

        print(f"[CloneVoice] Success! Voice ID: {voice_id}")

        if not voice_id:
            raise Exception("Failed to create voice clone")

        # DynamoDB에 사용자 음성 ID 저장
        get_table().put_item(Item={
            'PK': f'USER#{user_id}',
            'SK': 'CUSTOM_VOICE',
            'type': 'CUSTOM_VOICE',
            'userId': user_id,
            'voiceId': voice_id,
            'voiceName': voice_name,
            's3Key': s3_key,
            'createdAt': now,
            'updatedAt': now,
            'ttl': get_ttl()
        })

        return success_response({
            'success': True,
            'voiceId': voice_id,
            'voiceName': voice_name,
            'createdAt': now
        })

    except urllib.request.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        print(f"Clone voice HTTP error: {e.code} - {error_body}")
        return error_response(f"ElevenLabs API error: {error_body}", 500)
    except Exception as e:
        print(f"Clone voice error: {str(e)}")
        return error_response(str(e), 500)


def handle_tts_custom_voice(body):
    """클로닝된 음성으로 TTS 생성 (ElevenLabs)"""
    text = body.get('text', '')
    voice_id = body.get('voiceId', '')

    if not text:
        return error_response('No text provided')
    if not voice_id:
        return error_response('No voice ID provided')

    try:
        api_key = get_elevenlabs_api_key()
        if not api_key:
            raise Exception("ElevenLabs API key not found")

        # ElevenLabs Text-to-Speech API 호출
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }
        data = json.dumps({
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.5,
                "use_speaker_boost": True
            }
        }).encode('utf-8')

        req = urllib.request.Request(url, data=data, headers=headers, method='POST')

        with urllib.request.urlopen(req, timeout=30) as response:
            audio_data = response.read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')

        return success_response({
            'audio': audio_base64,
            'contentType': 'audio/mpeg',
            'voiceId': voice_id,
            'engine': 'elevenlabs-custom'
        })

    except Exception as e:
        print(f"Custom voice TTS error: {str(e)}")
        return error_response(str(e), 500)


# ============================================
# 사용자 메모리 핸들러 (세션 간 기억)
# ============================================

# 사용자 정보 추출용 프롬프트
USER_INFO_EXTRACTION_PROMPT = """Analyze this English conversation and extract any personal information about the user (student).

Conversation:
{conversation}

Extract and return a JSON object with any information you can find about the user:
{{
  "name": "<user's name if mentioned, or null>",
  "job": "<user's job/occupation if mentioned, or null>",
  "company": "<user's company/workplace if mentioned, or null>",
  "hobbies": [<list of hobbies/interests mentioned>],
  "family": "<family info if mentioned, or null>",
  "location": "<where user lives if mentioned, or null>",
  "goals": [<learning goals or life goals mentioned>],
  "recent_events": [<recent events/plans user mentioned, with dates if available>],
  "preferences": [<user's preferences, likes, dislikes>],
  "other_facts": [<any other interesting facts about the user>]
}}

Only include fields where you found actual information. Use null for fields with no data.
Return ONLY valid JSON, no other text."""


def handle_save_user_memory(body):
    """사용자 메모리 저장 (기존 메모리와 병합)"""
    validation_error = validate_required(body, 'userId')
    if validation_error:
        return validation_error

    user_id = body.get('userId')
    new_memory = body.get('memory', {})

    try:
        table = get_table()
        now = get_now()

        # 기존 메모리 조회
        response = table.get_item(
            Key={'PK': f'USER#{user_id}', 'SK': 'MEMORY'}
        )
        existing_item = response.get('Item')
        existing_memory = existing_item.get('memory', {}) if existing_item else {}

        # 메모리 병합 (새 정보로 업데이트, 리스트는 합치기)
        merged_memory = merge_memory(existing_memory, new_memory)

        # 저장
        table.put_item(Item={
            'PK': f'USER#{user_id}',
            'SK': 'MEMORY',
            'type': 'USER_MEMORY',
            'userId': user_id,
            'memory': merged_memory,
            'updatedAt': now,
            'ttl': get_ttl() + (365 * 24 * 60 * 60)  # 1년 추가 (총 약 1.25년)
        })

        print(f"[Memory] Saved for user {user_id[:8]}: {list(merged_memory.keys())}")

        return success_response({
            'success': True,
            'memory': merged_memory,
            'updatedAt': now
        })

    except Exception as e:
        print(f"Save user memory error: {str(e)}")
        return error_response(str(e), 500)


def handle_get_user_memory(body):
    """사용자 메모리 조회"""
    validation_error = validate_required(body, 'userId')
    if validation_error:
        return validation_error

    user_id = body.get('userId')

    try:
        response = get_table().get_item(
            Key={'PK': f'USER#{user_id}', 'SK': 'MEMORY'}
        )

        item = response.get('Item')
        if item:
            return success_response({
                'success': True,
                'memory': item.get('memory', {}),
                'updatedAt': item.get('updatedAt')
            })

        return success_response({
            'success': True,
            'memory': {},
            'message': 'No memory found for this user'
        })

    except Exception as e:
        print(f"Get user memory error: {str(e)}")
        return error_response(str(e), 500)


def handle_extract_user_info(body):
    """대화에서 사용자 정보 추출 (AI 사용)"""
    validation_error = validate_required(body, 'userId', 'messages')
    if validation_error:
        return validation_error

    user_id = body.get('userId')
    messages = body.get('messages', [])

    if len(messages) < 2:
        return success_response({
            'success': True,
            'extracted': {},
            'message': 'Not enough conversation to extract info'
        })

    try:
        # 대화 내용 포맷팅
        conversation_text = format_conversation_for_analysis(messages)

        # Claude로 정보 추출
        prompt = USER_INFO_EXTRACTION_PROMPT.format(conversation=conversation_text)

        response = bedrock.invoke_model(
            modelId=CLAUDE_MODEL,
            contentType='application/json',
            accept='application/json',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 1000,
                'messages': [{'role': 'user', 'content': prompt}]
            })
        )

        result = json.loads(response['body'].read())
        extracted_text = result['content'][0]['text']

        # JSON 파싱
        try:
            # JSON 블록 추출 시도
            if '```json' in extracted_text:
                extracted_text = extracted_text.split('```json')[1].split('```')[0]
            elif '```' in extracted_text:
                extracted_text = extracted_text.split('```')[1].split('```')[0]

            extracted_info = json.loads(extracted_text.strip())
        except json.JSONDecodeError:
            print(f"[Memory] JSON parse failed: {extracted_text[:200]}")
            extracted_info = {}

        # null 값 필터링
        extracted_info = {k: v for k, v in extracted_info.items() if v is not None and v != [] and v != ''}

        print(f"[Memory] Extracted for {user_id[:8]}: {list(extracted_info.keys())}")

        # 추출된 정보가 있으면 자동 저장
        if extracted_info:
            save_body = {'userId': user_id, 'memory': extracted_info}
            handle_save_user_memory(save_body)

        return success_response({
            'success': True,
            'extracted': extracted_info
        })

    except Exception as e:
        print(f"Extract user info error: {str(e)}")
        return error_response(str(e), 500)


def merge_memory(existing, new):
    """기존 메모리와 새 메모리 병합"""
    merged = existing.copy()

    for key, value in new.items():
        if value is None or value == '' or value == []:
            continue

        if key not in merged:
            merged[key] = value
        elif isinstance(value, list) and isinstance(merged[key], list):
            # 리스트: 중복 제거하며 합치기
            combined = merged[key] + [v for v in value if v not in merged[key]]
            merged[key] = combined[-20:]  # 최대 20개 유지
        else:
            # 단일 값: 새 값으로 대체
            merged[key] = value

    return merged


def format_conversation_for_analysis(messages):
    """대화 메시지를 분석용 텍스트로 포맷"""
    lines = []
    for msg in messages:
        role = msg.get('role', 'user')
        content = msg.get('content', '')
        speaker = 'Student' if role == 'user' else 'Tutor'
        lines.append(f"{speaker}: {content}")
    return '\n'.join(lines)


# ============================================
# 사용량 핸들러
# ============================================

def get_kst_date():
    """오늘 한국 날짜 문자열 (YYYY-MM-DD)"""
    KST = timezone(timedelta(hours=9))
    return datetime.now(KST).strftime('%Y-%m-%d')


def handle_get_usage(body):
    """사용자 사용량 조회"""
    user_id = body.get('userId') or body.get('deviceId')
    if not user_id:
        return error_response('userId or deviceId is required')

    today = get_kst_date()

    try:
        response = get_table().get_item(
            Key={'PK': f'DEVICE#{user_id}', 'SK': f'USAGE#{today}'}
        )
        item = response.get('Item')

        # 기본 사용량 및 제한
        default_limits = {
            'dailyChatCount': 50,
            'dailyTtsCount': 100,
            'dailyAnalyzeCount': 10
        }

        if item:
            usage = {
                'chatCount': int(item.get('chatCount', 0)),
                'ttsCount': int(item.get('ttsCount', 0)),
                'analyzeCount': int(item.get('analyzeCount', 0)),
                'date': today,
                'plan': item.get('plan', 'free'),
                'limits': default_limits,
                'resetTime': f'{today}T00:00:00+09:00'
            }
        else:
            usage = {
                'chatCount': 0,
                'ttsCount': 0,
                'analyzeCount': 0,
                'date': today,
                'plan': 'free',
                'limits': default_limits,
                'resetTime': f'{today}T00:00:00+09:00'
            }

        return success_response(usage)
    except Exception as e:
        print(f"Get usage error: {str(e)}")
        return error_response(str(e), 500)


def handle_increment_usage(body):
    """사용량 증가"""
    user_id = body.get('userId') or body.get('deviceId')
    usage_type = body.get('usageType', 'chat')

    if not user_id:
        return error_response('userId or deviceId is required')

    today = get_kst_date()
    count_field = f'{usage_type}Count'

    try:
        table = get_table()

        # Atomic increment
        response = table.update_item(
            Key={'PK': f'DEVICE#{user_id}', 'SK': f'USAGE#{today}'},
            UpdateExpression=f'SET {count_field} = if_not_exists({count_field}, :zero) + :inc, updatedAt = :now, #ttl = :ttl',
            ExpressionAttributeNames={'#ttl': 'ttl'},
            ExpressionAttributeValues={
                ':zero': 0,
                ':inc': 1,
                ':now': get_now(),
                ':ttl': get_ttl()
            },
            ReturnValues='ALL_NEW'
        )

        item = response.get('Attributes', {})

        return success_response({
            'success': True,
            'chatCount': int(item.get('chatCount', 0)),
            'ttsCount': int(item.get('ttsCount', 0)),
            'analyzeCount': int(item.get('analyzeCount', 0)),
            'date': today
        })
    except Exception as e:
        print(f"Increment usage error: {str(e)}")
        return error_response(str(e), 500)
