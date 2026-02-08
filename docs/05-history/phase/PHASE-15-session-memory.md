# Phase 15: Session Memory (크로스 세션 메모리)

**Timeline:** 2026-02-08
**Status:** Completed
**Branch:** `main`
**Impact:** AI가 이전 대화에서 알게 된 사용자 정보를 기억

---

## Overview

AI 튜터가 대화 중 알게 된 사용자 정보(이름, 직업, 관심사 등)를 저장하고, 다음 세션에서도 기억하여 개인화된 대화를 제공합니다.

**Key Objectives:**
- 대화 종료 시 사용자 정보 자동 추출
- DynamoDB에 사용자 메모리 저장
- 다음 대화 시 메모리 불러오기
- 시스템 프롬프트에 메모리 주입

---

## Implementation Details

### 1. Lambda 백엔드 - 메모리 핸들러

**파일:** `backend/lambda_function.py`

```python
# 사용자 정보 추출 프롬프트
USER_INFO_EXTRACTION_PROMPT = """
Analyze this conversation and extract key user information.
Return JSON with these fields (leave empty if not mentioned):
{
  "name": "",
  "occupation": "",
  "interests": [],
  "learning_goals": [],
  "preferences": [],
  "mentioned_facts": []
}
Only include information explicitly stated by the user.
"""

def handle_extract_user_info(body):
    """대화에서 사용자 정보 추출"""
    messages = body.get('messages', [])
    user_id = body.get('user_id')

    if not messages or not user_id:
        return {'extracted': {}}

    # Claude AI로 정보 추출
    conversation_text = format_conversation_for_analysis(messages)

    response = bedrock.invoke_model(
        modelId='anthropic.claude-3-haiku-20240307-v1:0',
        body=json.dumps({
            'messages': [{
                'role': 'user',
                'content': f"{USER_INFO_EXTRACTION_PROMPT}\n\nConversation:\n{conversation_text}"
            }],
            'max_tokens': 500
        })
    )

    # JSON 파싱
    result_text = json.loads(response['body'].read())['content'][0]['text']
    extracted = json.loads(result_text)

    # 기존 메모리와 병합 후 저장
    if any(extracted.values()):
        existing = handle_get_user_memory({'user_id': user_id}).get('memory', {})
        merged = merge_memory(existing, extracted)
        handle_save_user_memory({'user_id': user_id, 'memory': merged})

    return {'extracted': extracted, 'merged': merged}


def handle_save_user_memory(body):
    """사용자 메모리 저장"""
    user_id = body.get('user_id')
    memory = body.get('memory', {})

    get_table().put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': 'MEMORY',
        'memory': memory,
        'updatedAt': datetime.utcnow().isoformat()
    })

    return {'success': True}


def handle_get_user_memory(body):
    """사용자 메모리 조회"""
    user_id = body.get('user_id')

    response = get_table().get_item(
        Key={'PK': f'USER#{user_id}', 'SK': 'MEMORY'}
    )

    return {'memory': response.get('Item', {}).get('memory', {})}


def merge_memory(existing, new):
    """기존 메모리와 새 정보 병합"""
    merged = existing.copy()

    for key, value in new.items():
        if not value:
            continue

        if isinstance(value, list):
            # 리스트는 합치기 (중복 제거)
            existing_list = merged.get(key, [])
            merged[key] = list(set(existing_list + value))
        else:
            # 단일 값은 새 값으로 대체
            merged[key] = value

    return merged
```

---

### 2. handle_chat 수정 - 메모리 주입

**파일:** `backend/lambda_function.py`

```python
def handle_chat(body):
    """AI 대화 처리 (메모리 포함)"""
    messages = body.get('messages', [])
    settings = body.get('settings', {})
    user_id = body.get('user_id')

    # 시스템 프롬프트 생성
    system = SYSTEM_PROMPT.format(
        accent=settings.get('accent', 'us'),
        level=settings.get('level', 'intermediate'),
        topic=settings.get('topic', 'daily')
    )

    # 사용자 메모리 불러오기
    if user_id:
        try:
            response = get_table().get_item(
                Key={'PK': f'USER#{user_id}', 'SK': 'MEMORY'}
            )
            memory = response.get('Item', {}).get('memory', {})

            if memory:
                user_memory_prompt = "\n\n[User Memory - Things you know about this user]\n"

                if memory.get('name'):
                    user_memory_prompt += f"- Name: {memory['name']}\n"
                if memory.get('occupation'):
                    user_memory_prompt += f"- Occupation: {memory['occupation']}\n"
                if memory.get('interests'):
                    user_memory_prompt += f"- Interests: {', '.join(memory['interests'])}\n"
                if memory.get('learning_goals'):
                    user_memory_prompt += f"- Learning goals: {', '.join(memory['learning_goals'])}\n"
                if memory.get('mentioned_facts'):
                    user_memory_prompt += f"- Other facts: {', '.join(memory['mentioned_facts'])}\n"

                user_memory_prompt += "\nUse this information naturally in conversation when relevant."
                system += user_memory_prompt

        except Exception as e:
            print(f"[Memory] Error loading memory: {e}")

    # Bedrock Claude 호출
    response = bedrock.invoke_model(...)
    # ...
```

---

### 3. 프론트엔드 API 함수

**파일:** `src/utils/api.js`

```javascript
/**
 * 사용자 메모리 조회
 */
export async function getUserMemory() {
  const userId = getUserId()
  if (!userId) return {}

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get_user_memory',
      user_id: userId
    })
  })

  const data = await response.json()
  return data.memory || {}
}

/**
 * 사용자 메모리 저장
 */
export async function saveUserMemory(memory) {
  const userId = getUserId()
  if (!userId) return { success: false }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save_user_memory',
      user_id: userId,
      memory
    })
  })

  return response.json()
}

/**
 * 대화에서 사용자 정보 추출
 */
export async function extractUserInfo(messages) {
  const userId = getUserId()
  if (!userId || messages.length < 4) return { extracted: {} }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'extract_user_info',
      user_id: userId,
      messages
    })
  })

  return response.json()
}
```

---

### 4. Call.jsx에서 정보 추출

**파일:** `src/pages/Call.jsx`

```jsx
import { extractUserInfo } from '../utils/api'

function Call() {
  // 통화 종료 시
  const handleEndCall = async () => {
    // ... 세션 종료 처리

    // 백그라운드에서 사용자 정보 추출 (비동기)
    if (messages.length >= 4) {
      extractUserInfo(messages)
        .then(res => {
          if (res.extracted && Object.keys(res.extracted).length > 0) {
            console.log('[Memory] Extracted user info:', Object.keys(res.extracted))
          }
        })
        .catch(err => console.error('[Memory] Extract error:', err))
    }

    // 결과 페이지로 이동
    navigate('/result', { state: { ... } })
  }
}
```

---

## DynamoDB 스키마

```
┌─────────────────────────────────────────────────────────────┐
│  Table: eng-learning-conversations                          │
├─────────────────────────────────────────────────────────────┤
│  PK (Partition Key)     │  SK (Sort Key)                    │
├─────────────────────────────────────────────────────────────┤
│  USER#{userId}          │  MEMORY                           │
│                         │                                   │
│  Attributes:                                                │
│  - memory: {                                                │
│      name: "영광",                                          │
│      occupation: "개발자",                                  │
│      interests: ["AI", "영어", "여행"],                     │
│      learning_goals: ["비즈니스 영어", "해외 취업"],         │
│      preferences: ["천천히 말해주세요"],                     │
│      mentioned_facts: ["서울에 살아요", "고양이를 키워요"]   │
│    }                                                        │
│  - updatedAt: "2026-02-08T12:00:00Z"                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 메모리 병합 로직

```python
def merge_memory(existing, new):
    """
    병합 규칙:
    - 리스트 (interests, goals 등): 기존 + 새로운 = 합집합 (중복 제거)
    - 단일 값 (name, occupation 등): 새 값으로 대체

    예시:
    existing = {"name": "영광", "interests": ["AI"]}
    new = {"occupation": "개발자", "interests": ["영어"]}
    result = {"name": "영광", "occupation": "개발자", "interests": ["AI", "영어"]}
    """
```

---

## File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `backend/lambda_function.py` | Modified | extract_user_info, save/get_user_memory 핸들러 |
| `src/utils/api.js` | Modified | getUserMemory, saveUserMemory, extractUserInfo 추가 |
| `src/pages/Call.jsx` | Modified | 통화 종료 시 extractUserInfo 호출 |

---

## 메모리 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                       대화 시작                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Lambda: handle_chat                                         │
│                                                              │
│  1. DynamoDB에서 USER#{userId}/MEMORY 조회                   │
│  2. 메모리가 있으면 시스템 프롬프트에 추가:                   │
│     "[User Memory - Things you know about this user]         │
│      - Name: 영광                                            │
│      - Occupation: 개발자                                    │
│      - Interests: AI, 영어, 여행"                            │
│  3. Claude AI 호출                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AI 튜터 응답 (메모리 활용)                                  │
│                                                              │
│  "Hi 영광! How's your work as a developer going?             │
│   Last time you mentioned you're interested in AI.           │
│   Have you learned anything new about it?"                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       대화 종료                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Call.jsx: extractUserInfo(messages)                        │
│                                                              │
│  백그라운드 비동기 처리 (사용자 대기 없음)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Lambda: handle_extract_user_info                           │
│                                                              │
│  1. 대화 내용을 Claude AI로 분석                            │
│  2. 새로운 정보 추출:                                       │
│     {"occupation": "백엔드 개발자",                         │
│      "mentioned_facts": ["다음 주에 미국 출장"]}            │
│  3. 기존 메모리와 병합                                      │
│  4. DynamoDB에 저장                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 대화 예시

### 첫 번째 세션

```
User: Hi, my name is 영광. I'm a developer.
AI: Nice to meet you, 영광! What kind of development do you do?

User: I work on backend systems, mainly using Python.
AI: Python is great for backend! Are you working on any interesting projects?
```

**추출된 정보:**
```json
{
  "name": "영광",
  "occupation": "backend developer",
  "mentioned_facts": ["uses Python"]
}
```

### 두 번째 세션 (다음 날)

```
AI: Hi 영광! How's your backend work going?
    Working on any interesting Python projects lately?

User: Yeah, I'm building an AI chatbot for our company.
AI: That sounds exciting! AI chatbots are really popular now.
    Are you using any specific frameworks?
```

---

## Testing Checklist

- [x] 첫 대화 시 정보 추출
- [x] DynamoDB에 메모리 저장
- [x] 다음 세션 시 메모리 불러오기
- [x] 시스템 프롬프트에 메모리 주입
- [x] AI가 메모리 활용하여 대화
- [x] 메모리 병합 (리스트/단일값)
- [x] 백그라운드 비동기 처리

---

## Next Steps

- Phase 16: Claude 4.5 Opus Direct API 마이그레이션
- 메모리 관리 UI (Settings에서 조회/삭제)

---

## References

- [DynamoDB Single-Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [Claude AI Prompt Engineering](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Phase 14: Google Calendar](PHASE-14-google-calendar.md)

---

*Last Updated: 2026-02-08*
