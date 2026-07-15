import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageWrapper simple>
      <div className="flex flex-col items-center justify-center text-center p-8 max-w-md bg-card border border-border rounded-2xl shadow-lg glass">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 animate-bounce">
          <Compass size={32} />
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          404 - Lost Course
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          The solution design or page path you requested does not exist or has been archived. Check spelling or return to active proposal workspace.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate('/')}
          className="w-full gap-2"
        >
          <Home size={16} />
          Go to Dashboard
        </Button>
      </div>
    </PageWrapper>
  );
};

export default NotFound;
