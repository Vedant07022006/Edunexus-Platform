import { useParams } from 'react';
import Navbar from '../../shared/components/Navbar';
import LecturePlayer from '../components/LecturePlayer';

export default function LearnPage() {
  const { courseId } = useParams();
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-20 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <LecturePlayer courseId={courseId} />
      </div>
    </div>
  );
}
