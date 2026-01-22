# Ringle AI - 기술 다이어그램

## 1. 기술 구성도 (System Architecture)

```mermaid
flowchart TB
    subgraph USER["User Layer"]
        U[("User<br/>iOS / Android / Web")]
    end

    subgraph FRONTEND["Frontend Layer"]
        direction TB
        REACT["React 19 + Vite 7"]
        CAP["Capacitor 8<br/>(iOS/Android Bridge)"]
        PAGES["Pages<br/>Home | Call | Result | Settings"]
        SPEECH["Web Speech API<br/>(Browser STT)"]

        REACT --> CAP
        REACT --> PAGES
        PAGES --> SPEECH
    end

    subgraph AWS["AWS Cloud Infrastructure"]
        direction TB

        subgraph API["API Layer"]
            APIGW["API Gateway"]
            CF["CloudFront CDN"]
        end

        subgraph COMPUTE["Compute Layer"]
            LAMBDA["AWS Lambda<br/>(Python 3.11)"]
        end

        subgraph AI["AI/ML Services"]
            direction LR
            BEDROCK["AWS Bedrock<br/>(Claude Haiku)"]
            POLLY["Amazon Polly<br/>(TTS)"]
            TRANSCRIBE["AWS Transcribe<br/>(STT)"]
            TRANSLATE["Amazon Translate"]
        end

        subgraph STORAGE["Storage Layer"]
            direction LR
            DYNAMO[("DynamoDB<br/>Sessions, Settings")]
            S3[("S3 Bucket<br/>Audio, Static")]
        end

        APIGW --> LAMBDA
        CF --> S3
        LAMBDA --> BEDROCK
        LAMBDA --> POLLY
        LAMBDA --> TRANSCRIBE
        LAMBDA --> TRANSLATE
        LAMBDA --> DYNAMO
        LAMBDA --> S3
    end

    U <--> FRONTEND
    FRONTEND <--> API

    style USER fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style FRONTEND fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style AWS fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style AI fill:#fce4ec,stroke:#e91e63,stroke-width:2px
    style BEDROCK fill:#ff6b6b,stroke:#c0392b,stroke-width:2px,color:#fff
```

---

## 2. 기술 작동 흐름도 (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant F as Frontend (React)
    participant W as Web Speech API
    participant L as Lambda
    participant B as Bedrock (Claude)
    participant P as Polly
    participant D as DynamoDB

    rect rgb(232, 245, 233)
        Note over U,D: 음성 대화 흐름
        U->>F: 음성 입력 (말하기)
        F->>W: 음성 인식 요청
        W-->>F: 텍스트 변환 결과
        F->>L: chat API 호출
        L->>B: AI 대화 요청

        rect rgb(255, 235, 238)
            Note over B: [Domain Knowledge 필요 지점 1]<br/>레벨별 적절한 응답 생성<br/>비즈니스/일상 영어 전문성
        end

        B-->>L: AI 응답 텍스트
        L->>P: TTS 요청
        P-->>L: 음성 데이터 (MP3)
        L-->>F: 응답 + 음성
        F->>U: 음성 재생
    end

    rect rgb(227, 242, 253)
        Note over U,D: 분석 및 저장 흐름
        U->>F: 통화 종료
        F->>L: analyze API 호출
        L->>B: 대화 분석 요청

        rect rgb(255, 235, 238)
            Note over B: [Domain Knowledge 필요 지점 2]<br/>CAFP 점수 평가 기준<br/>문법 오류 분류 체계<br/>레벨별 피드백 설계
        end

        B-->>L: 분석 결과 (JSON)
        L->>D: 세션 데이터 저장
        D-->>L: 저장 완료
        L-->>F: 분석 결과 반환
        F->>U: 결과 화면 표시
    end
```

---

## 3. Domain Knowledge 필요 영역

```mermaid
flowchart LR
    subgraph CURRENT["현재 시스템"]
        AI["AI (Claude)<br/>일반적 영어 지식<br/>패턴 기반 분석<br/>프롬프트 의존"]
    end

    GAP["GAP"]

    subgraph NEED["필요한 전문 지식"]
        direction TB
        E1["CAFP 평가<br/>CEFR 기준 연계<br/>점수 산정 루브릭"]
        E2["문법 교정<br/>오류 분류 체계<br/>L1 간섭 패턴"]
        E3["토픽 콘텐츠<br/>비즈니스 영어<br/>면접 영어"]
        E4["학습 경로<br/>레벨별 목표<br/>AI 응답 가이드"]
    end

    subgraph EXPERT["Domain Expert"]
        DE["영어영문학 전문가<br/>TESOL/TEFL 자격<br/>영어 교육 경험"]
    end

    CURRENT --> GAP
    GAP --> NEED
    NEED --> EXPERT
    EXPERT -.->|"검증 및 설계"| CURRENT

    style GAP fill:#ff6b6b,stroke:#c0392b,stroke-width:3px,color:#fff
    style EXPERT fill:#6c5ce7,stroke:#5849c4,stroke-width:2px,color:#fff
```

> **핵심 문제:** AI 프롬프트만으로는 교육학적으로 검증된 품질을 보장하기 어려움.
> 영어 영문학 전문가가 평가 기준 설계, 프롬프트 검증, 콘텐츠 개발, 품질 모니터링을 담당해야 함.

---

## 4. CAFP 평가 시스템 상세

```mermaid
flowchart TB
    subgraph CAFP["CAFP 평가 체계"]
        direction TB

        subgraph C["Complexity - 복잡성"]
            C1["문장 구조 복잡도"]
            C2["어휘 난이도"]
            C3["종속절/관계절 사용"]
        end

        subgraph A["Accuracy - 정확성"]
            A1["문법 오류 심각도"]
            A2["L1 간섭 오류"]
            A3["비즈니스 표현 적절성"]
        end

        subgraph F["Fluency - 유창성"]
            F1["담화 구조 자연스러움"]
            F2["필러워드 비율"]
            F3["응답 속도/흐름"]
        end

        subgraph P["Pronunciation - 발음"]
            P1["텍스트 기반 예측"]
            P2["한국인 공통 오류"]
            P3["억양별 특성"]
        end
    end

    subgraph CEFR["CEFR 기준 연계"]
        L1["A1-A2<br/>Beginner"]
        L2["B1-B2<br/>Intermediate"]
        L3["C1-C2<br/>Advanced"]
    end

    CAFP --> CEFR

    style C fill:#74b9ff,stroke:#0984e3
    style A fill:#55efc4,stroke:#00b894
    style F fill:#ffeaa7,stroke:#fdcb6e
    style P fill:#fab1a0,stroke:#e17055
```

---

## 5. 문법 오류 분류 체계 (Error Taxonomy)

```mermaid
flowchart TB
    ROOT["Grammar Errors - 문법 오류"]

    ROOT --> M["Morphological<br/>형태론적"]
    ROOT --> S["Syntactic<br/>통사론적"]
    ROOT --> L["Lexical<br/>어휘적"]
    ROOT --> PR["Pragmatic<br/>화용론적"]

    M --> M1["Subject-Verb Agreement<br/>주어-동사 일치"]
    M --> M2["Tense Errors<br/>시제 오류"]
    M --> M3["Plural/Singular<br/>단수/복수"]

    S --> S1["Word Order<br/>어순"]
    S --> S2["Missing Elements<br/>요소 누락"]
    S --> S3["Redundancy<br/>중복"]

    L --> L1["Wrong Word Choice<br/>단어 선택 오류"]
    L --> L2["Collocation Errors<br/>연어 오류"]
    L --> L3["Register Mismatch<br/>문체 불일치"]

    PR --> PR1["Inappropriate Formality<br/>격식 부적절"]
    PR --> PR2["Cultural Issues<br/>문화적 부적절"]

    subgraph L1INT["한국인 특화 오류 - L1 Interference"]
        K1["관사 누락/오용<br/>a/an/the"]
        K2["전치사 직역<br/>go to home"]
        K3["시제 일관성"]
        K4["Konglish 표현"]
    end

    ROOT -.-> L1INT

    style ROOT fill:#6c5ce7,color:#fff
    style L1INT fill:#ff7675,stroke:#d63031
```

---

## 6. Domain Expert 역할 및 업무 분담

```mermaid
pie showData
    title Domain Expert 업무 비중
    "평가 체계 설계" : 30
    "AI 프롬프트 설계" : 25
    "콘텐츠 개발" : 25
    "품질 검증" : 20
```

```mermaid
flowchart LR
    subgraph ROLE["Domain Expert 역할"]
        direction TB
        R1["평가 체계 설계 30%<br/>CAFP 점수 기준<br/>레벨별 기대 수준<br/>평가 루브릭"]
        R2["AI 프롬프트 설계 25%<br/>교육적 대화 유도<br/>분석 프롬프트 검증<br/>피드백 톤/내용"]
        R3["콘텐츠 개발 25%<br/>토픽별 시나리오<br/>레벨별 어휘 리스트<br/>문법 설명 템플릿"]
        R4["품질 검증 20%<br/>AI 응답 모니터링<br/>사용자 피드백 분석<br/>지속적 개선"]
    end

    subgraph QUAL["자격 요건"]
        Q1["영어영문학과 전공"]
        Q2["TESOL/TEFL 자격증"]
        Q3["성인 영어 교육 경험"]
        Q4["비즈니스 영어 지식"]
    end

    QUAL --> ROLE

    style ROLE fill:#dfe6e9,stroke:#636e72
    style QUAL fill:#81ecec,stroke:#00cec9
```

---

## 7. 기술 스택 요약

| 계층 | 기술 | 용도 |
|------|------|------|
| **Frontend** | React 19 + Vite 7 | UI 프레임워크 |
| | Capacitor 8 | iOS/Android 네이티브 브릿지 |
| | Web Speech API | 브라우저 음성 인식 |
| **Backend** | AWS Lambda (Python 3.11) | 서버리스 함수 |
| | API Gateway | REST API 엔드포인트 |
| **AI/ML** | AWS Bedrock (Claude Haiku) | 대화 생성 + 분석 |
| | Amazon Polly | TTS (음성 합성) |
| | AWS Transcribe | STT (음성 인식) |
| | Amazon Translate | 영한 번역 |
| **Storage** | DynamoDB | 사용자 데이터, 세션 기록 |
| | S3 | 오디오 파일, 정적 리소스 |
| **Hosting** | CloudFront + S3 | 웹 배포 |
