import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Settings from './pages/Settings'
import TutorSettings from './pages/TutorSettings'
import ScheduleSettings from './pages/ScheduleSettings'
import CurriculumSettings from './pages/CurriculumSettings'
import RoleplaySettings from './pages/RoleplaySettings'
import RoleplayCategory from './pages/RoleplayCategory'
import Call from './pages/Call'
import Result from './pages/Result'
import Script from './pages/Script'
import Analysis from './pages/Analysis'
import Practice from './pages/Practice'
import './App.css'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/tutor" element={<TutorSettings />} />
        <Route path="/settings/schedule" element={<ScheduleSettings />} />
        <Route path="/settings/curriculum" element={<CurriculumSettings />} />
        <Route path="/settings/roleplay" element={<RoleplaySettings />} />
        <Route path="/settings/roleplay/category" element={<RoleplayCategory />} />
        <Route path="/call" element={<Call />} />
        <Route path="/result" element={<Result />} />
        <Route path="/script" element={<Script />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/practice" element={<Practice />} />
      </Routes>
    </div>
  )
}

export default App
