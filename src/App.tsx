import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { CursorFollower } from '@/components/ui/CursorFollower';

const HomePage = lazy(() => import('@/pages/HomePage'));
const EngineeringGallery = lazy(() => import('@/pages/EngineeringGallery'));
const EngineeringProjectPage = lazy(() => import('@/pages/EngineeringProjectPage'));
const CreativeGallery = lazy(() => import('@/pages/CreativeGallery'));
const CreativeProjectPage = lazy(() => import('@/pages/CreativeProjectPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ResumePage = lazy(() => import('@/pages/ResumePage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export default function App() {
  return (
    <BrowserRouter>
      <CursorFollower />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="engineering" element={<EngineeringGallery />} />
          <Route path="engineering/:slug" element={<EngineeringProjectPage />} />
          <Route path="creative" element={<CreativeGallery />} />
          <Route path="creative/:slug" element={<CreativeProjectPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="resume" element={<ResumePage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
