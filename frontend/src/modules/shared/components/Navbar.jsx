import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Menu, X, User, LogOut, LayoutDashboard,
  ChevronDown, Zap, Sun, Moon, Flag, Package
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { label: 'Courses', href: '/courses' },
    { label: 'Bundles', href: '/bundles' },
  ];

  return (
    <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-slate-900/[0.06] dark:border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl gradient-text">EduNexus</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(link.href)
                    ? 'text-primary-400 bg-primary-500/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 transition-all"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl glass-strong hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all"
                >
                  <div className="w-7 h-7 gradient-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user.fullName?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-800 dark:text-slate-200 max-w-[120px] truncate">{user.fullName}</span>
                  <ChevronDown size={14} className={`text-slate-600 dark:text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden shadow-xl border border-slate-900/10 dark:border-white/10 bg-surface-2"
                    >
                      <div className="p-3 border-b border-slate-900/[0.06] dark:border-white/[0.06]">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Signed in as</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-primary-500/20 text-primary-300 rounded-full capitalize">{user.role}</span>
                      </div>
                      <div className="p-1.5">
                        <Link
                          to={user.role === 'instructor' ? '/instructor' : '/dashboard'}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 rounded-lg transition-all"
                        >
                          <LayoutDashboard size={15} />
                          Dashboard
                        </Link>
                        {user.role === 'instructor' && (
                          <Link
                            to="/instructor/reports"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 rounded-lg transition-all"
                          >
                            <Flag size={15} />
                            Reports
                          </Link>
                        )}
                        {user.role === 'instructor' && (
                          <Link
                            to="/instructor/bundles/create"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 rounded-lg transition-all"
                          >
                            <Package size={15} />
                            Bundles
                          </Link>
                        )}
                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 rounded-lg transition-all"
                        >
                          <User size={15} />
                          Profile
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <LogOut size={15} />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Login
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-medium gradient-primary text-white rounded-xl hover:opacity-90 transition-opacity glow-sm">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <button
            className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            onClick={() => setMobileOpen(v => !v)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-slate-900/[0.06] dark:border-white/[0.06] overflow-hidden"
          >
            <div className="p-4 space-y-1">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 rounded-xl transition-all"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>

              {navLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 rounded-xl transition-all"
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <div className="px-4 py-2 border-t border-slate-900/[0.06] dark:border-white/[0.06] mt-2 pt-3">
                    <p className="text-xs text-slate-500">{user.email}</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{user.fullName}</p>
                  </div>
                  <Link to={user.role === 'instructor' ? '/instructor' : '/dashboard'} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 rounded-xl transition-all">Dashboard</Link>
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/5 rounded-xl transition-all">Profile</Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all">Logout</button>
                </>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 py-2.5 text-sm text-center border border-slate-900/10 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300">Login</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 py-2.5 text-sm text-center gradient-primary text-white rounded-xl font-medium">Get Started</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
