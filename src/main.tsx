import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from '@/App'
import Home from '@/pages/Home'
import TopicPage from '@/pages/TopicPage'
import QuestionPage from '@/pages/QuestionPage'
import SearchPage from '@/pages/SearchPage'
import NotFound from '@/pages/NotFound'
import '@/index.css'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Home />} />
          <Route path="topic/:topicId" element={<TopicPage />} />
          <Route path="q/:slug" element={<QuestionPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
