import { Link } from 'react-router-dom';
import { Zap, Code2, Globe2, Share2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-900/[0.06] dark:border-white/[0.06] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="font-bold text-xl gradient-text">EduNexus</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
              The next-generation EdTech platform powered by AI. Learn, grow, and succeed with world-class instructors.
            </p>
            <div className="flex gap-3 mt-6">
              {[Code2, Globe2, Share2].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 glass rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Platform</h4>
            <ul className="space-y-2">
              {['Courses', 'Instructors', 'Pricing', 'Blog'].map(item => (
                <li key={item}>
                  <Link to="/courses" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-400 transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Company</h4>
            <ul className="space-y-2">
              {['About', 'Careers', 'Privacy', 'Terms'].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-900/[0.06] dark:border-white/[0.06] mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">© 2025 EduNexus. All rights reserved.</p>
          <p className="text-xs text-slate-500">Built with ❤️ for learners worldwide</p>
        </div>
      </div>
    </footer>
  );
}
