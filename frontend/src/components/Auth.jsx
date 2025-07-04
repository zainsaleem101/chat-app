import { useState, memo } from 'react';

function Auth({ onLogin, onSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        const user = await onSignup(email, password);
        if (user) {
          setMessage('Signup successful! Please check your email to verify your account.');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">{isLogin ? 'Login' : 'Sign Up'}</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
              placeholder="Email"
              required
            />
          </div>
          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
              placeholder="Password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-lg transition duration-300 transform hover:scale-105"
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {message && <p className="text-green-500 mt-4">{message}</p>}
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setMessage('');
          }}
          className="mt-4 text-indigo-400 hover:text-indigo-300"
        >
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}

export default memo(Auth);