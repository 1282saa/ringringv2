#!/bin/bash

# DynamoDB 테이블 생성 스크립트
# 사용법: ./setup-dynamodb.sh

REGION="us-east-1"

echo "Creating DynamoDB tables for usage tracking..."

# 1. UsageTable - 일일 사용량 저장
echo "Creating ai-english-usage table..."
aws dynamodb create-table \
  --table-name ai-english-usage \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION \
  --tags Key=Project,Value=ai-english-call

# 2. UserPlanTable - 사용자 플랜 정보
echo "Creating ai-english-user-plans table..."
aws dynamodb create-table \
  --table-name ai-english-user-plans \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION \
  --tags Key=Project,Value=ai-english-call

echo "Done! Tables created successfully."
echo ""
echo "Table structure:"
echo ""
echo "ai-english-usage:"
echo "  PK: USER#{userId}"
echo "  SK: DATE#{YYYY-MM-DD}"
echo "  Attributes: chatCount, ttsCount, analyzeCount, updatedAt"
echo ""
echo "ai-english-user-plans:"
echo "  PK: userId"
echo "  Attributes: plan, transactionId, upgradedAt, expiresAt"
