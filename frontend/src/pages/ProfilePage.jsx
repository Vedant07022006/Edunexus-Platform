import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword, deleteAccount } from '../services/api.service';
import Navbar from '../components/layout/Navbar';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { User, Mail, Lock, Shield, BookOpen, Calendar, Trash2, AlertTriangle } from 'lucide-react';
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
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage your account information</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Card */}
          <div className="glass rounded-2xl p-6 border border-white/[0.06] text-center h-fit">
            <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto text-white text-3xl font-bold mb-4">
              {user?.fullName?.[0]?.toUpperCase()}
            </div>
            <h3 className="font-semibold text-white">{user?.fullName}</h3>
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

          {/* Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Form */}
            <div className="glass rounded-2xl p-6 border border-white/[0.06]">
              <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
                <User size={16} className="text-primary-400" /> Personal Information
              </h2>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <Input label="Full Name" icon={User} value={profileForm.fullName}
                  onChange={e => setProfileForm(p => ({ ...p, fullName: e.target.value }))} />
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Bio</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    maxLength={500}
                    placeholder="Tell us about yourself..."
                    className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all resize-none"
                  />
                  <p className="text-xs text-slate-600 mt-1 text-right">{profileForm.bio.length}/500</p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" loading={saving} size="md">Save Changes</Button>
                </div>
              </form>
            </div>

            {/* Password Form */}
            <div className="glass rounded-2xl p-6 border border-white/[0.06]">
              <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
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

            {/* Danger Zone */}
            <div className="glass rounded-2xl p-6 border border-red-500/20">
              <h2 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                <Trash2 size={16} className="text-red-400" /> Danger Zone
              </h2>
              <p className="text-sm text-slate-400 mb-4">
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

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong rounded-2xl border border-white/10 p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Account</h3>
            </div>

            <p className="text-sm text-slate-400 mb-2">
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
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
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
