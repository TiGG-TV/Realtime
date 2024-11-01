import React from 'react';
import Link from 'next/link';

const FooterSection: React.FC = () => {
  return (
    <footer className="bg-white py-4 mt-auto border-t border-gray-200 ml-64">
      <div className="container mx-auto px-4">
        <nav className="flex flex-wrap justify-between items-center">
          <div className="flex space-x-6">
            <Link href="/about" className="text-gray-600 hover:text-gray-800 transition-colors text-sm">
              About
            </Link>
            <Link href="/careers" className="text-gray-600 hover:text-gray-800 transition-colors text-sm">
              Careers
            </Link>
            <Link href="/blog" className="text-gray-600 hover:text-gray-800 transition-colors text-sm">
              Blog
            </Link>
          </div>
          <div className="flex space-x-4">
            <Link href="/privacy-policy" className="text-gray-500 hover:text-gray-700 transition-colors text-xs">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-gray-500 hover:text-gray-700 transition-colors text-xs">
              Terms of Service
            </Link>
          </div>
        </nav>
      </div>
    </footer>
  );
};

export default FooterSection;

// Console log for error catching
console.log('FooterSection component loaded');
