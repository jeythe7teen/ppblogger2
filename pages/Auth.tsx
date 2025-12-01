import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/store';
import { UserRole } from '../types';
import { Button, Input, Card } from '../components/UI';
import { LogIn, UserPlus, Send } from 'lucide-react';
import { useTranslations } from '../LanguageContext';
import { FirebaseError } from 'firebase/app';

interface AuthPageProps {
  onLogin: () => void;
}

type AuthView = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

// Map Firebase error codes to translation keys
const getFirebaseErrorKey = (code: string): string => {
  const errorMap: { [key: string]: string } = {
    "auth/invalid-credential": "errors.invalidCredentials",
    "auth/email-already-in-use": "errors.userExists",
    "auth/weak-password": "errors.passwordTooShort",
    "auth/user-not-found": "errors.userNotFound",
  };
  return errorMap[code] || 'errors.loginFailed'; // Generic fallback
};


export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const { t } = useTranslations();
  const [view, setView] = useState<AuthView>('LOGIN');
  const [username, setUsername] = useState(''); // Kept for UI, not saved
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const clearFormState = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setRepeatPassword('');
    setError('');
    setSuccess('');
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    setError('');

    try {
      await StorageService.login(email, password);
      onLogin();
      // App's onAuthChange listener will navigate based on role
      // But we can navigate to home immediately for a better UX
      navigate('/');
    } catch (err: any) {
      const firebaseError = err as FirebaseError;
      const errorKey = getFirebaseErrorKey(firebaseError.code);
      setError(t(errorKey));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (password !== repeatPassword) {
      setError(t('errors.passwordsDoNotMatch'));
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      await StorageService.registerUser(email, password);
      onLogin();
      // onAuthChange listener will pick up the new user
      navigate('/');
    } catch (err: any) {
        const firebaseError = err as FirebaseError;
        const errorKey = getFirebaseErrorKey(firebaseError.code);
        setError(t(errorKey));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await StorageService.sendPasswordResetEmail(email);
      setSuccess(t('auth.resetPasswordSuccess'));
    } catch (err: any) {
      const firebaseError = err as FirebaseError;
      const errorKey = getFirebaseErrorKey(firebaseError.code);
      setError(t(errorKey));
    } finally {
      setIsLoading(false);
    }
  };

  const renderLogin = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <Input 
        label={t('auth.emailLabel')}
        type="email"
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoFocus
        required
      />
       <Input 
        label={t('auth.passwordLabel')}
        type="password"
        placeholder={t('auth.passwordPlaceholder')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
       <div className="text-right text-sm">
          <button 
            type="button" 
            onClick={() => { setView('FORGOT_PASSWORD'); clearFormState(); }}
            className="font-medium text-primary/80 hover:text-primary transition-colors"
          >
            {t('auth.forgotPassword')}
          </button>
       </div>
      <Button type="submit" className="w-full" icon={LogIn} isLoading={isLoading}>
        {t('auth.loginButton')}
      </Button>
    </form>
  );
  
  const renderRegister = () => (
     <form onSubmit={handleRegister} className="space-y-4">
      <Input 
        label={t('auth.usernameLabel')}
        placeholder={t('auth.usernamePlaceholder')}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Input 
        label={t('auth.emailAddressLabel')}
        type="email"
        placeholder={t('auth.emailAddressPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <Input 
        label={t('auth.passwordLabel')}
        type="password"
        placeholder={t('auth.passwordPlaceholder')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
      />
      <Input 
        label={t('auth.repeatPasswordLabel')}
        type="password"
        placeholder={t('auth.repeatPasswordPlaceholder')}
        value={repeatPassword}
        onChange={(e) => setRepeatPassword(e.target.value)}
        autoComplete="new-password"
        required
      />
      <Button type="submit" className="w-full" variant="secondary" icon={UserPlus} isLoading={isLoading}>
        {t('auth.createAccountButton')}
      </Button>
    </form>
  );
  
  const renderForgotPassword = () => (
    <form onSubmit={handlePasswordReset} className="space-y-4">
      <p className="text-sm text-gray-400">{t('auth.resetPasswordInstructions')}</p>
      <Input 
        label={t('auth.emailLabel')}
        type="email"
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoFocus
        required
      />
      <Button type="submit" className="w-full" icon={Send} isLoading={isLoading}>
        {t('auth.sendResetLink')}
      </Button>
       <div className="text-center">
            <Button variant="ghost" type="button" onClick={() => { setView('LOGIN'); clearFormState(); }}>
                {t('auth.backToLogin')}
            </Button>
        </div>
    </form>
  );
  
  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-heading font-bold text-white">
            {view === 'LOGIN' && t('auth.welcomeBack')}
            {view === 'REGISTER' && t('auth.joinStory')}
            {view === 'FORGOT_PASSWORD' && t('auth.resetPasswordTitle')}
          </h2>
        </div>
        <Card className="p-8 border-t-4 border-primary">
            {view !== 'FORGOT_PASSWORD' && (
              <div className="flex border-b border-slate-700 mb-6">
                  <button 
                      onClick={() => { setView('LOGIN'); clearFormState(); }}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${view === 'LOGIN' ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-white'}`}
                  >
                      {t('auth.loginTab')}
                  </button>
                  <button 
                      onClick={() => { setView('REGISTER'); clearFormState(); }}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${view === 'REGISTER' ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-white'}`}
                  >
                      {t('auth.registerTab')}
                  </button>
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded relative mb-4 text-sm" role="alert">
                {error}
                {error === t('errors.userExists') && (
                  <button onClick={() => setView('LOGIN')} className="font-bold underline ml-1">{t('auth.signInLink')}</button>
                )}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded relative mb-4 text-sm" role="alert">
                {success}
              </div>
            )}
            
            {view === 'LOGIN' && renderLogin()}
            {view === 'REGISTER' && renderRegister()}
            {view === 'FORGOT_PASSWORD' && renderForgotPassword()}
        </Card>
      </div>
    </div>
  );
};