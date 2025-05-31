"use client"; // Can be a client component if it has interactive elements or hooks, otherwise not strictly necessary for just links.
              // For consistency and future additions, let's make it client.

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // To highlight active link

export default function Header() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    \`hover:text-blue-300 transition-colors px-3 py-2 rounded-md text-sm font-medium \${
      pathname === path ? 'bg-blue-700 text-white' : 'text-blue-100'
    }\`;

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" legacyBehavior>
              <a className="text-xl font-bold hover:text-blue-200">Project Manager</a>
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link href="/" legacyBehavior>
                <a className={linkClass('/')}>Projects</a>
              </Link>
              <Link href="/projects/new" legacyBehavior>
                <a className={linkClass('/projects/new')}>Create New Project</a>
              </Link>
              {/* Add more navigation links here as needed */}
            </div>
          </div>
          {/* Mobile menu button can be added here later */}
        </div>
      </nav>
    </header>
  );
}
