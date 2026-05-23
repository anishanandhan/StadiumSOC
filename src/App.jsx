import { useState } from 'react';
import LoginPage from './components/LoginPage';
import CommandCenter from './components/CommandCenter';

export default function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return <CommandCenter user={user} onLogout={() => setUser(null)} />;
}
