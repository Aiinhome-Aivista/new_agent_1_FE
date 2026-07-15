import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store';
import { loginSchema } from '../../utils/validators';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { useToast } from '../../components/ui/Toast/Toast';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';

type LoginFormInput = any;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: 'password',
    }
  });

  const onSubmit = async (data: LoginFormInput) => {
    try {
      setLoading(true);
      await login(data);
      toast('Login successful! Welcome to PwC Advisory.', 'success');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid credentials. Use admin / password.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper simple>
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-2xl shadow-xl glass flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl shadow-md">
            P
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mt-2 text-foreground">
            Advisory Proposal Creator
          </h2>
          <p className="text-xs text-muted-foreground">
            Sign in using your PwC domain credentials to access orchestrator agents
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Domain Username"
            type="text"
            placeholder="e.g. admin"
            error={errors.username?.message as string}
            {...register('username')}
          />
          
          <Input
            label="Security Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message as string}
            {...register('password')}
          />

          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border text-[11px] text-muted-foreground leading-snug">
            <ShieldCheck size={16} className="text-primary flex-shrink-0" />
            <span>Default demo profile seeded in MySQL: <strong>admin</strong> / <strong>password</strong>.</span>
          </div>

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
    </PageWrapper>
  );
};

export default Login;
