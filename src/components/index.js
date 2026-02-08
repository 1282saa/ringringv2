/**
 * @file components/index.js
 * @description 공통 컴포넌트 모음
 *
 * 사용법:
 * import { Modal, Card, LoadingSpinner, SettingSection } from '../components'
 */

// 레이아웃 컴포넌트
export { default as BottomNav } from './BottomNav'
export { default as TutorAvatar } from './TutorAvatar'

// UI 컴포넌트
export { Modal } from './Modal'
export { Card, StatCard } from './Card'
export { LoadingSpinner, InlineLoader } from './LoadingSpinner'

// 설정 관련 컴포넌트
export {
  SettingSection,
  SettingItem,
  SettingToggle,
  SettingOptions,
  PageHeader
} from './SettingComponents'

// 사용량 관련 컴포넌트
export { UsageCard, UsageBadge } from './UsageDisplay'
export { UpgradeModal } from './UpgradeModal'

// 학습 관련 컴포넌트
export { default as LearningCalendar } from './LearningCalendar'
export { default as DailyScheduleInput } from './DailyScheduleInput'

// 커스터마이징 컴포넌트
export { default as CustomTutorModal } from './CustomTutorModal'
export { default as PetUploadModal } from './PetUploadModal'
export { default as VoiceRecordingSection } from './VoiceRecordingSection'
export { default as GoogleCalendarSection } from './GoogleCalendarSection'

// 학습 사이클 컴포넌트
export { default as TodayProgress } from './TodayProgress'
export { default as IncomingCallOverlay } from './IncomingCallOverlay'
