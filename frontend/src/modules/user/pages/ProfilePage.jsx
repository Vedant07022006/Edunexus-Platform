import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { updateProfile, changePassword, deleteAccount, toggleTwoFactor } from '../../shared/services/api.service';
import Navbar from '../../shared/components/Navbar';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import { User, Lock, Shield, BookOpen, Calendar, Trash2, AlertTriangle, ShieldCheck, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({ fullName: user?.fullName || '', bio: user?.bio || '' });
  const [passForm, setPassForm]       = useState({ oldPassword: '', newPassword: '' });
  const [saving, setSaving]           = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling2fa, setToggling2fa] = useState(false);

  const handle2faToggle = async () => {
    const enabling = !user?.twoFactorEnabled;
    if (enabling) {
      if (!window.confirm('Enable two-factor authentication?\n\nYou will receive an OTP by email on every login.')) return;
    } else {
      if (!window.confirm('Disable two-factor authentication?\n\nYour account will no longer require an OTP on login.')) return;
    }
    setToggling2fa(true);
    try {
      const { data } = await toggleTwoFactor(enabling);
      updateUser({ twoFactorEnabled: data.data.twoFactorEnabled });
      toast.success(enabling ? '2FA enabled — you\'ll receive an OTP on next login' : '2FA disabled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update 2FA setting');
    } finally {
      setToggling2fa(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await updateProfile(profileForm);
      updateUser(data.data);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setChangingPass(true);
    try {
      await changePassword(passForm);
      toast.success('Password changed!');
      setPassForm({ oldPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Profile Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">Manage your account information</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass rounded-2xl p-6 border border-slate-900/[0.06] dark:border-white/[0.06] text-center h-fit">
            <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto text-white text-3xl font-bold mb-4">
              {user?.fullName?.[0]?.toUpperCase()}
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{user?.fullName}</h3>
            <p className="text-sm text-slate-500 mt-1">{user?.email}</p>
            <span className="inline-block mt-2 text-xs px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full capitalize">
              {user?.role}
            </span>

            <div className="mt-6 space-y-2 text-left">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar size={12} />
                Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Shield size={12} />
                Email verified
              </div>
              {user?.role === 'student' && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <BookOpen size={12} />
                  {user?.enrolledCourses?.length || 0} enrolled courses
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6 border border-slate-900/[0.06] dark:border-white/[0.06]">
              <h2 className="font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                <User size={16} className="text-primary-400" /> Personal Information
              </h2>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <Input label="Full Name" icon={User} value={profileForm.fullName}
                  onChange={e => setProfileForm(p => ({ ...p, fullName: e.target.value }))} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Bio</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    maxLength={500}
                    placeholder="Tell us about yourself..."
                    className="w-full glass border border-slate-900/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all resize-none"
                  />
                  <p className="text-xs text-slate-600 mt-1 text-right">{profileForm.bio.length}/500</p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" loading={saving} size="md">Save Changes</Button>
                </div>
              </form>
            </div>

            <div className="glass rounded-2xl p-6 border border-slate-900/[0.06] dark:border-white/[0.06]">
              <h2 className="font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                <Lock size={16} className="text-primary-400" /> Change Password
              </h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input label="Current Password" type="password" icon={Lock}
                  placeholder="Your current password"
                  value={passForm.oldPassword}
                  onChange={e => setPassForm(p => ({ ...p, oldPassword: e.target.value }))} />
                <Input label="New Password" type="password" icon={Lock}
                  placeholder="Min 8 characters"
                  value={passForm.newPassword}
                  onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))} />
                <div className="flex justify-end">
                  <Button type="submit" variant="secondary" loading={changingPass} size="md">
                    Update Password
                  </Button>
                </div>
              </form>
            </div>

            <div className="glass rounded-2xl p-6 border border-slate-900/[0.06] dark:border-white/[0.06]">
              <h2 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <Shield size={16} className="text-primary-400" /> Security
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                Two-factor authentication adds an extra layer of security. When enabled, you'll receive a
                one-time code by email each time you sign in.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user?.twoFactorEnabled
                    ? <ShieldCheck size={20} className="text-emerald-400" />
                    : <ShieldOff size={20} className="text-slate-400" />}
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Two-Factor Authentication
                    </p>
                    <p className="text-xs text-slate-500">
                      {user?.twoFactorEnabled ? 'Enabled — OTP required on login' : 'Disabled — password only'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handle2faToggle}
                  disabled={toggling2fa}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 focus:outline-none ${
                    user?.twoFactorEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  title={user?.twoFactorEnabled ? 'Click to disable 2FA' : 'Click to enable 2FA'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      user?.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-red-500/20">
              <h2 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                <Trash2 size={16} className="text-red-400" /> Danger Zone
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {user?.role === 'instructor'
                  ? 'Deleting your account will archive all your courses. Enrolled students will retain access, but no new enrollments will be accepted.'
                  : 'Permanently deactivate your account. Your enrollment history and progress will be preserved.'}
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-5 py-2.5 text-sm font-medium text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-all"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong rounded-2xl border border-slate-900/10 dark:border-white/10 p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Account</h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Are you sure you want to delete your account? This action cannot be undone by you.
            </p>

            {user?.role === 'instructor' && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs text-amber-300/90 leading-relaxed">
                  <strong>As an instructor:</strong> All your courses will be archived and hidden from the marketplace.
                  Existing enrolled students will retain access. No new enrollments will be accepted.
                  Payments and enrollment records will be preserved.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteAccount();
                    toast.success('Account deactivated successfully');
                    await logout();
                    navigate('/');
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to delete account');
                  } finally {
                    setDeleting(false);
                    setShowDeleteModal(false);
                  }
                }}
                disabled={deleting}
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
