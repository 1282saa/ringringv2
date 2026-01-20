/**
 * @file lambda/usageHandler.js
 * @description 사용량 제한 Lambda 핸들러
 *
 * 이 파일의 함수들을 기존 Lambda에 추가하거나
 * 별도의 Lambda로 배포하세요.
 *
 * 필요한 DynamoDB 테이블:
 * - UsageTable: 사용자별 일일 사용량 저장
 * - UserPlanTable: 사용자별 플랜 정보 저장
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

// DynamoDB 클라이언트 설정
const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

// 테이블 이름 (환경변수로 설정)
const USAGE_TABLE = process.env.USAGE_TABLE || 'ai-english-usage';
const USER_PLAN_TABLE = process.env.USER_PLAN_TABLE || 'ai-english-user-plans';

// 플랜별 제한
const USAGE_LIMITS = {
  free: {
    dailyChatCount: 3,
    dailyTtsCount: 10,
    dailyAnalyzeCount: 1,
  },
  basic: {
    dailyChatCount: 20,
    dailyTtsCount: 100,
    dailyAnalyzeCount: 5,
  },
  premium: {
    dailyChatCount: -1, // 무제한
    dailyTtsCount: -1,
    dailyAnalyzeCount: -1,
  },
};

/**
 * 오늘 날짜 문자열 반환 (KST 기준)
 */
function getTodayDateString() {
  const now = new Date();
  // UTC+9 (KST)
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);
  return kstDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * 자정까지 남은 시간 계산 (KST 기준)
 */
function getResetTime() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);

  // 다음 자정 계산
  const tomorrow = new Date(kstNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return tomorrow.toISOString();
}

/**
 * 사용자 플랜 조회
 */
async function getUserPlan(userId) {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: USER_PLAN_TABLE,
        Key: { userId },
      })
    );

    return result.Item?.plan || 'free';
  } catch (error) {
    console.error('Error getting user plan:', error);
    return 'free';
  }
}

/**
 * 오늘의 사용량 조회
 */
async function getTodayUsage(userId) {
  const today = getTodayDateString();

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: USAGE_TABLE,
        Key: {
          pk: `USER#${userId}`,
          sk: `DATE#${today}`,
        },
      })
    );

    if (result.Item) {
      return {
        chatCount: result.Item.chatCount || 0,
        ttsCount: result.Item.ttsCount || 0,
        analyzeCount: result.Item.analyzeCount || 0,
      };
    }

    // 오늘 기록이 없으면 초기화
    return {
      chatCount: 0,
      ttsCount: 0,
      analyzeCount: 0,
    };
  } catch (error) {
    console.error('Error getting today usage:', error);
    return {
      chatCount: 0,
      ttsCount: 0,
      analyzeCount: 0,
    };
  }
}

/**
 * 사용량 증가
 */
async function incrementUsage(userId, usageType) {
  const today = getTodayDateString();
  const field = `${usageType}Count`;

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: USAGE_TABLE,
        Key: {
          pk: `USER#${userId}`,
          sk: `DATE#${today}`,
        },
        UpdateExpression: `SET ${field} = if_not_exists(${field}, :zero) + :inc, updatedAt = :now`,
        ExpressionAttributeValues: {
          ':zero': 0,
          ':inc': 1,
          ':now': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return {
      chatCount: result.Attributes.chatCount || 0,
      ttsCount: result.Attributes.ttsCount || 0,
      analyzeCount: result.Attributes.analyzeCount || 0,
    };
  } catch (error) {
    console.error('Error incrementing usage:', error);
    throw error;
  }
}

/**
 * 사용량 제한 확인
 */
async function checkLimit(userId, usageType) {
  const plan = await getUserPlan(userId);
  const limits = USAGE_LIMITS[plan];
  const usage = await getTodayUsage(userId);

  const limitKey = `daily${usageType.charAt(0).toUpperCase() + usageType.slice(1)}Count`;
  const usageKey = `${usageType}Count`;

  const limit = limits[limitKey];
  const current = usage[usageKey];

  // -1은 무제한
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      plan,
    };
  }

  const remaining = Math.max(0, limit - current);

  return {
    allowed: remaining > 0,
    remaining,
    plan,
    current,
    limit,
  };
}

// ============================================
// Lambda 핸들러 함수들
// ============================================

/**
 * 사용량 조회 핸들러
 * action: 'get_usage'
 */
async function handleGetUsage(userId) {
  const plan = await getUserPlan(userId);
  const usage = await getTodayUsage(userId);
  const limits = USAGE_LIMITS[plan];

  return {
    success: true,
    plan,
    chatCount: usage.chatCount,
    ttsCount: usage.ttsCount,
    analyzeCount: usage.analyzeCount,
    limits: {
      dailyChatCount: limits.dailyChatCount,
      dailyTtsCount: limits.dailyTtsCount,
      dailyAnalyzeCount: limits.dailyAnalyzeCount,
    },
    resetTime: getResetTime(),
  };
}

/**
 * 사용량 증가 핸들러
 * action: 'increment_usage'
 */
async function handleIncrementUsage(userId, usageType) {
  // 먼저 제한 확인
  const checkResult = await checkLimit(userId, usageType);

  if (!checkResult.allowed) {
    return {
      success: false,
      error: 'USAGE_LIMIT_EXCEEDED',
      message: '일일 사용량을 초과했습니다.',
      ...checkResult,
    };
  }

  // 사용량 증가
  const newUsage = await incrementUsage(userId, usageType);
  const plan = await getUserPlan(userId);

  return {
    success: true,
    plan,
    ...newUsage,
    resetTime: getResetTime(),
  };
}

/**
 * 사용량 제한 확인 핸들러
 * action: 'check_usage_limit'
 */
async function handleCheckUsageLimit(userId, usageType) {
  const result = await checkLimit(userId, usageType);

  return {
    success: true,
    ...result,
    resetTime: getResetTime(),
  };
}

/**
 * 플랜 업그레이드 핸들러
 * action: 'upgrade_plan'
 */
async function handleUpgradePlan(userId, plan, transactionId) {
  // TODO: 실제 결제 검증 로직 추가

  try {
    await docClient.send(
      new PutCommand({
        TableName: USER_PLAN_TABLE,
        Item: {
          userId,
          plan,
          transactionId,
          upgradedAt: new Date().toISOString(),
          expiresAt: getExpirationDate(plan),
        },
      })
    );

    return {
      success: true,
      plan,
      message: '플랜이 업그레이드되었습니다.',
    };
  } catch (error) {
    console.error('Error upgrading plan:', error);
    return {
      success: false,
      error: 'UPGRADE_FAILED',
      message: '플랜 업그레이드에 실패했습니다.',
    };
  }
}

/**
 * 플랜 만료일 계산 (월간 구독)
 */
function getExpirationDate(plan) {
  if (plan === 'free') return null;

  const now = new Date();
  now.setMonth(now.getMonth() + 1);
  return now.toISOString();
}

// ============================================
// 메인 핸들러 (기존 Lambda에 통합)
// ============================================

/**
 * 사용량 관련 액션 처리
 * 기존 Lambda의 switch 문에 추가하세요.
 *
 * @example
 * // 기존 Lambda 핸들러에 추가:
 * case 'get_usage':
 *   return await handleGetUsage(userId);
 * case 'increment_usage':
 *   return await handleIncrementUsage(userId, body.usageType);
 * case 'check_usage_limit':
 *   return await handleCheckUsageLimit(userId, body.usageType);
 * case 'upgrade_plan':
 *   return await handleUpgradePlan(userId, body.plan, body.transactionId);
 */

// Export for use in main Lambda
module.exports = {
  handleGetUsage,
  handleIncrementUsage,
  handleCheckUsageLimit,
  handleUpgradePlan,
  checkLimit,
  incrementUsage,
  USAGE_LIMITS,
};
