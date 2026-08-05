import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, Star, BookOpen, Lock, Play } from 'lucide-react';

const levelColors = {
  beginner: 'bg-emerald-500/20 text-emerald-400',
  intermediate: 'bg-yellow-500/20 text-yellow-400',
  advanced: 'bg-red-500/20 text-red-400',
};

export default function CourseCard({ course, index = 0 }) {
  const hours = ((course.totalDuration || 0) / 3600).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link to={`/courses/${course._id}`}>
        <div className="glass rounded-2xl overflow-hidden card-hover border border-slate-900/[0.06] dark:border-white/[0.06] group">
          {/* Thumbnail */}
          <div className="relative aspect-video bg-surface-3 overflow-hidden">
            {course.thumbnail?.url ? (
              <img
                src={course.thumbnail.url}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center gradient-card">
                <BookOpen size={40} className="text-primary-400 opacity-50" />
              </div>
            )}

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center glow">
                <Play size={20} className="text-white ml-1" fill="white" />
              </div>
            </div>

            {/* Price badge */}
            <div className="absolute top-3 right-3">
              {course.isFree ? (
                <span className="bg-emerald-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm">FREE</span>
              ) : (
                <span className="bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm">₹{course.price}</span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Level badge */}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelColors[course.level] || levelColors.beginner}`}>
              {course.level}
            </span>

            <h3 className="mt-2 font-semibold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 group-hover:text-primary-300 transition-colors">
              {course.title}
            </h3>

            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 truncate">
              by {course.instructor?.fullName || 'Instructor'}
            </p>

            {/* Stats */}
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <BookOpen size={11} />
                {course.totalLectures} lectures
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {hours}h
              </span>
              <span className="flex items-center gap-1">
                <Users size={11} />
                {course.totalEnrollments}
              </span>
            </div>

            {/* Rating */}
            {course.rating?.totalRatings > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <Star size={12} className="text-yellow-400" fill="currentColor" />
                <span className="text-xs text-yellow-400 font-medium">{course.rating.average.toFixed(1)}</span>
                <span className="text-xs text-slate-500">({course.rating.totalRatings})</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden border border-slate-900/[0.06] dark:border-white/[0.06] animate-pulse">
      <div className="aspect-video bg-slate-900/5 dark:bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-slate-900/5 dark:bg-white/5 rounded w-20" />
        <div className="h-4 bg-slate-900/5 dark:bg-white/5 rounded w-full" />
        <div className="h-3 bg-slate-900/5 dark:bg-white/5 rounded w-3/4" />
        <div className="h-3 bg-slate-900/5 dark:bg-white/5 rounded w-1/2" />
      </div>
    </div>
  );
}
