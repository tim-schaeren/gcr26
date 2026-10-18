import { Link } from 'react-router-dom';

export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          Grand City Race
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-1">{title}</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated {updated}</p>
        <div className="space-y-5 text-[15px] leading-relaxed text-gray-700">{children}</div>
        <div className="mt-12 pt-6 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <Link to="/privacy" className="hover:text-gray-700">Privacy</Link>
          <Link to="/terms" className="hover:text-gray-700">Terms</Link>
          <Link to="/guidelines" className="hover:text-gray-700">Community guidelines</Link>
        </div>
      </div>
    </div>
  );
}

export function H2({ children }) {
  return <h2 className="text-base font-semibold text-gray-900 pt-3">{children}</h2>;
}

export function UL({ children }) {
  return <ul className="list-disc pl-5 space-y-1.5">{children}</ul>;
}
