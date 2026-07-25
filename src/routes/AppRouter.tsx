import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { ROUTES } from './routes.config';

// Lazy load all page components
const Landing = lazy(() => import('../pages/Landing/Landing'));
const Home = lazy(() => import('../pages/Home/Home'));
const Settings = lazy(() => import('../pages/Settings/Settings'));
const Archive = lazy(() => import('../pages/Archive/Archive'));
const CaseStudies = lazy(() => import('../pages/CaseStudies/CaseStudies'));
const Login = lazy(() => import('../pages/Login/Login'));
const NotFound = lazy(() => import('../pages/NotFound/NotFound'));

// Global spinner fallback
const PageSpinner: React.FC = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <span className="text-sm font-medium animate-pulse text-muted-foreground">Loading Platform...</span>
    </div>
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path={ROUTES.landing} element={<Landing />} />
          <Route path={ROUTES.login} element={<Login />} />
          
          <Route
            path={ROUTES.dashboard}
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          
          <Route
            path={ROUTES.settings}
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
          
          <Route
            path={ROUTES.archive}
            element={
              <PrivateRoute>
                <Archive />
              </PrivateRoute>
            }
          />

          <Route
            path={ROUTES.caseStudies}
            element={
              <PrivateRoute>
                <CaseStudies />
              </PrivateRoute>
            }
          />
          
          <Route path={ROUTES.notFound} element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
