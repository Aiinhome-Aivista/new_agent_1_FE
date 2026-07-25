import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, ChevronDown, ChevronUp, Zap, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../store';
import { loginSchema } from '../../utils/validators';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { useToast } from '../../components/ui/Toast/Toast';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';

type LoginFormInput = any;

// Demo users — matching the seeded DB users
const DEMO_USERS = [
  {
    username: 'admin',
    password: 'password123',
    role: 'Administrator',
    description: 'Full system access',
    color: 'text-rose-500',
    dot: 'bg-rose-500',
    bg: 'hover:bg-rose-500/10 hover:border-rose-500/30',
  }
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: 'password123',
    }
  });

  const onSubmit = async (data: LoginFormInput) => {
    try {
      setLoading(true);
      await login(data);
      toast('Login successful! Welcome to Solution Advisory.', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid credentials.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (username: string, password: string) => {
    setValue('username', username);
    setValue('password', password);
  };

  return (
    <PageWrapper simple>
      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Login Card */}
        <div className="p-8 bg-card border border-border rounded-2xl shadow-xl glass flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl shadow-md">
              <BarChart3/>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mt-2 text-foreground">
              Advisory Proposal Creator
            </h2>
            <p className="text-xs text-muted-foreground">
              Sign in using your corporate domain credentials to access orchestrator agents
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Username"
              type="text"
              placeholder="e.g. admin"
              error={errors.username?.message as string}
              {...register('username')}
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message as string}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              className="w-full mt-2"
            >
              Authenticate Profile
            </Button>
          </form>
        </div>

        {/* Demo Credentials Panel */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-foreground/70 hover:bg-muted/30 transition-colors"
            onClick={() => setShowDemo((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-primary" />
              <span>Demo Role Credentials — Quick Sign-in</span>
            </div>
            {showDemo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showDemo && (
            <div className="px-3 pb-3 flex flex-col gap-1.5">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => fillCredentials(u.username, u.password)}
                  className={`
                    w-full flex items-center justify-between p-2.5 rounded-xl border border-transparent
                    bg-muted/30 text-left transition-all duration-200 group ${u.bg}
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${u.dot}`} />
                    <div className="flex flex-col gap-0">
                      <span className={`text-[11px] font-bold leading-tight ${u.color}`}>
                        {u.role}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {u.description}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                    {u.username}
                  </span>
                </button>
              ))}

              <div className="flex items-start gap-2 p-2.5 bg-muted/20 rounded-xl border border-border/60 mt-1 text-[10px] text-muted-foreground leading-snug">
                <ShieldCheck size={13} className="text-primary flex-shrink-0 mt-0.5" />
                <span>
                  Click any role above to auto-fill credentials. All passwords are seeded in the MySQL demo database.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default Login;
