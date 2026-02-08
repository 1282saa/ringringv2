# Phase 16: Claude API 설정 및 비용 최적화

**Timeline:** 2026-02-08
**Status:** Completed
**Branch:** `main`
**Impact:** Claude 3 Haiku 사용으로 비용 최적화

---

## Overview

AWS Bedrock을 통해 Claude 3 Haiku 모델을 사용하여 비용을 최적화했습니다. Haiku는 Claude 모델 중 가장 저렴하면서도 빠른 응답 속도를 제공합니다.

**Key Objectives:**
- Claude 3 Haiku 모델 사용 (최저 비용)
- AWS Bedrock 통합
- 비용 효율적인 AI 대화

---

## 현재 설정

### Lambda 모델 설정

**파일:** `backend/lambda_function.py`

```python
# Claude 3 Haiku - 가장 저렴한 모델
CLAUDE_MODEL = 'anthropic.claude-3-haiku-20240307-v1:0'
```

---

## 모델별 비용 비교

| 모델 | Input (1M 토큰) | Output (1M 토큰) | 속도 | 현재 사용 |
|------|----------------|-----------------|------|----------|
| **Claude 3 Haiku** | **$0.25** | **$1.25** | 가장 빠름 | ✅ 사용 중 |
| Claude 3 Sonnet | $3.00 | $15.00 | 보통 | - |
| Claude 3.5 Sonnet | $3.00 | $15.00 | 보통 | - |
| Claude 3 Opus | $15.00 | $75.00 | 느림 | - |
| Claude 4.5 Opus | $15.00 | $75.00 | 느림 | - |

**Haiku vs Opus 비용 차이:**
- Input: 60배 저렴
- Output: 60배 저렴

---

## 예상 월간 비용

| 사용량 | Haiku 비용 | Opus 비용 (비교) |
|--------|-----------|-----------------|
| 100회 대화 | ~$0.50 | ~$30 |
| 1,000회 대화 | ~$5 | ~$300 |
| 10,000회 대화 | ~$50 | ~$3,000 |

---

## 구현 상세

### Bedrock 호출

```python
def handle_chat(body):
    """AI 대화 처리 (Bedrock Claude Haiku)"""
    messages = body.get('messages', [])
    settings = body.get('settings', {})

    # 시스템 프롬프트 생성
    system = SYSTEM_PROMPT.format(
        accent=settings.get('accent', 'us'),
        level=settings.get('level', 'intermediate'),
        topic=settings.get('topic', 'daily')
    )

    # Bedrock Claude 호출
    response = bedrock.invoke_model(
        modelId=CLAUDE_MODEL,  # anthropic.claude-3-haiku
        contentType='application/json',
        accept='application/json',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 1024,
            'system': system,
            'messages': claude_messages
        })
    )

    result = json.loads(response['body'].read())
    return {'message': result['content'][0]['text']}
```

---

## 추가 비용 절감 방법

### 1. max_tokens 제한
```python
'max_tokens': 512  # 1024 → 512로 줄이기
```

### 2. 시스템 프롬프트 최적화
```python
# 짧고 간결한 프롬프트 사용
SYSTEM_PROMPT = """You are an English tutor. Keep responses under 2 sentences."""
```

### 3. 불필요한 API 호출 제거
- 분석 요청 최소화
- 메모리 추출 간격 조정

---

## File Summary

| File | Description |
|------|-------------|
| `backend/lambda_function.py` | CLAUDE_MODEL = claude-3-haiku |

---

## 비용 모니터링

AWS Cost Explorer에서 Bedrock 사용량 확인:
```
서비스: Amazon Bedrock
모델: anthropic.claude-3-haiku
리전: us-east-1
```

---

## References

- [AWS Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [Claude Model Comparison](https://docs.anthropic.com/claude/docs/models-overview)
- [Phase 15: Session Memory](PHASE-15-session-memory.md)

---

*Last Updated: 2026-02-08*
