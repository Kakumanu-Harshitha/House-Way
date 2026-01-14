import React, { useEffect } from 'react';
import { Platform } from 'react-native';

const WebStyleInjector = () => {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Inject global CSS styles for web
      const style = document.createElement('style');
      style.textContent = `
        /* Global web styles for Houseway app */
        html, body, #root {
          height: 100%;
          min-height: 100vh;
          width: 100%;
          max-width: 100vw;
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          scrollbar-gutter: stable;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          background-color: #f5f5f5;
          line-height: 1.6;
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
          max-width: 100vw;
          height: 100%;
          min-height: 100vh;
        }
        
        /* Ensure React Native ScrollView works on web */
        div[role="region"] {
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        
        /* ReactNativeWeb ScrollView fix */
        [data-testid="scrollView"],
        [class*="ScrollView"],
        [class*="scrollView"] {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch !important;
        }
        
        * {
          box-sizing: border-box;
        }
        
        /* Remove default button styles */
        button {
          border: none;
          background: none;
          padding: 0;
          margin: 0;
          font: inherit;
          cursor: pointer;
        }
        
        /* React Native Web ScrollView fixes */
        [class*="ScrollView"] {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch !important;
        }
        
        /* Ensure nested scroll views work */
        [class*="RNWeb_RCTScrollView"] {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        
        /* Fix for view containers to allow scrolling */
        [role="main"],
        [role="region"],
        main {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Focus styles for accessibility */
        button:focus,
        input:focus,
        textarea:focus,
        select:focus {
          outline: 2px solid #2196F3;
          outline-offset: 2px;
        }
        
        /* Hover effects for interactive elements */
        .web-hover:hover {
          opacity: 0.8;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        .web-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: box-shadow 0.2s ease;
        }
        
        /* Responsive utilities */
        @media (max-width: 480px) {
          .hide-mobile {
            display: none !important;
          }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          .hide-tablet {
            display: none !important;
          }
        }
        
        @media (min-width: 769px) {
          .hide-desktop {
            display: none !important;
          }
        }
        
        /* Print styles */
        @media print {
          body {
            background: white !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-break {
            page-break-before: always;
          }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .card {
            border: 2px solid #000 !important;
          }
          
          button {
            border: 1px solid #000 !important;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        /* Dark mode support (future enhancement) */
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1a1a1a;
            color: #ffffff;
          }
        }
        
        /* Loading animation */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
        
        /* Fade in animation */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Button styles */
        .web-button {
          transition: all 0.2s ease;
          border-radius: 8px;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          user-select: none;
        }
        
        .web-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .web-button:active {
          transform: translateY(0);
        }
        
        /* Input styles */
        .web-input {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          border-radius: 8px;
          border: 1px solid #ddd;
          padding: 12px 15px;
          font-size: 16px;
          background-color: #f9f9f9;
        }
        
        .web-input:focus {
          border-color: #2196F3;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
          background-color: #fff;
        }
        
        /* Card styles */
        .web-card {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: box-shadow 0.2s ease;
        }
        
        /* Navigation styles */
        .web-nav {
          background: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        /* Responsive grid */
        .responsive-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        
        /* Utility classes */
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-normal { font-weight: normal; }
        .uppercase { text-transform: uppercase; }
        .lowercase { text-transform: lowercase; }
        .capitalize { text-transform: capitalize; }
        
        /* Spacing utilities */
        .m-0 { margin: 0; }
        .p-0 { padding: 0; }
        .mt-1 { margin-top: 8px; }
        .mb-1 { margin-bottom: 8px; }
        .pt-1 { padding-top: 8px; }
        .pb-1 { padding-bottom: 8px; }
      `;

      document.head.appendChild(style);

      // Set page title
      document.title = 'Houseway - House Design Company';

      // Set meta tags
      const metaViewport = document.querySelector('meta[name="viewport"]');
      if (metaViewport) {
        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }

      // Add favicon if not present
      if (!document.querySelector('link[rel="icon"]')) {
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏠</text></svg>';
        document.head.appendChild(favicon);
      }

      return () => {
        // Cleanup if needed
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      };
    }
  }, []);

  return null; // This component doesn't render anything
};

export default WebStyleInjector;
