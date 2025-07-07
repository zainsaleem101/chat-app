import { useState, memo } from 'react';
import { useAuth } from '../stores/useAuthStore';

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { login, signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        const user = await signup(email, password);
        if (user) {
          setMessage('Signup successful! Please check your email to verify your account.');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900">
      <div className="bg-white/10 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
        <h1 className="text-4xl font-extrabold text-white mb-6 text-center tracking-tight drop-shadow-lg">{isLogin ? 'Login' : 'Sign Up'}</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-indigo-950/60 text-white border border-indigo-400/20 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-indigo-300"
              placeholder="Email"
              required
            />
          </div>
          <div className="mb-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-indigo-950/60 text-white border border-indigo-400/20 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-indigo-300"
              placeholder="Password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition duration-300 shadow-lg text-lg"
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        {message && <p className="text-green-400 mt-4 text-center">{message}</p>}
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setMessage('');
          }}
          className="mt-6 w-full text-indigo-200 hover:text-indigo-100 text-center text-base font-medium"
        >
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}

export default memo(Auth);