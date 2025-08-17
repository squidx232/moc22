import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedDepartment, setRequestedDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signUpUser = useMutation(api.userSignup.requestSignup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name || !password) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signUpUser({
        email: email.trim(),
        name: name.trim(),
        password,
        requestedDepartment: requestedDepartment.trim() || undefined,
      });

      if (result.success) {
        toast.success(result.message, { duration: 8000 });
        // Reset form
        setEmail('');
        setName('');
        setPassword('');
        setConfirmPassword('');
        setRequestedDepartment('');
      }
    } catch (error: any) {
      toast.error(`Sign-up failed: ${error.message}`, { duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <UserPlus size={48} className="mx-auto text-primary mb-3" />
        <h2 className="text-2xl font-bold text-primary">Request New Account</h2>
        <p className="text-sm text-gray-600 mt-2">
          Submit a request for admin approval
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address *"
            className="auth-input-field"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name *"
            className="auth-input-field"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min. 6 characters) *"
            className="auth-input-field pr-10"
            required
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password *"
            className="auth-input-field pr-10"
            required
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div>
          <input
            type="text"
            value={requestedDepartment}
            onChange={(e) => setRequestedDepartment(e.target.value)}
            placeholder="Requested Department (optional)"
            className="auth-input-field"
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          className="auth-button w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting Request...' : 'Submit Account Request'}
        </button>

        <div className="text-center text-sm text-gray-600 mt-4">
          <p>
            Your request will be reviewed by an administrator.
            You'll be notified once your account is approved.
          </p>
        </div>
      </form>
    </div>
  );
}
