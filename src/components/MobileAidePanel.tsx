import { useState } from 'react';

type AideSection = 'getting-started' | 'devices' | 'editor' | 'export' | 'shortcuts' | 'faq';

interface AideSectionConfig {
  id: AideSection;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function MobileAidePanel() {
  const [expandedSection, setExpandedSection] = useState<AideSection | null>('getting-started');

  const toggleSection = (id: AideSection) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const sections: AideSectionConfig[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>Welcome to the Rack Configurator! This tool lets you design custom 19" rack-mount panels for 3D printing.</p>
          <ol className="list-decimal list-inside space-y-2">
            <li><strong className="text-white">Choose rack size</strong> - Select 1U through 6U in Settings</li>
            <li><strong className="text-white">Add devices</strong> - Browse the Devices tab and tap to add</li>
            <li><strong className="text-white">Position devices</strong> - Drag devices on the 2D editor to arrange</li>
            <li><strong className="text-white">Configure properties</strong> - Select a device and adjust its mount type, position, and dimensions</li>
            <li><strong className="text-white">Export</strong> - Open Files, choose STL or SCAD, then tap Download when ready</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'devices',
      title: 'Device Library',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>The device library contains 50+ pre-configured devices organized by category:</p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">&#9679;</span>
              <span><strong className="text-white">Networking</strong> - Switches, routers, patch panels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">&#9679;</span>
              <span><strong className="text-white">Mini PCs</strong> - Raspberry Pi, Intel NUC, and more</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">&#9679;</span>
              <span><strong className="text-white">Storage</strong> - NAS devices, HDD/SSD mounts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">&#9679;</span>
              <span><strong className="text-white">Accessories</strong> - Cable management, vents, blanking panels</span>
            </li>
          </ul>
          <p>You can also create custom devices with exact dimensions using the "Custom Device" form.</p>
        </div>
      ),
    },
    {
      id: 'editor',
      title: '2D/3D Editor',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p><strong className="text-white">2D Editor</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Drag devices to reposition them on the rack panel</li>
            <li>Select a device by tapping it</li>
            <li>Shallow racks open enlarged: swipe horizontally in Pan mode and pinch directly on the rack to zoom in or out. Fit view shows the whole rack; Detail view enlarges it again.</li>
            <li>Grid snapping helps with precise alignment</li>
          </ul>
          <p className="mt-3"><strong className="text-white">3D Preview</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Real-time 3D visualization of your rack panel</li>
            <li>Rotate by dragging, zoom with pinch gesture</li>
            <li>Use two fingers to pan and pinch to zoom</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'export',
      title: 'Exporting Your Design',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <ul className="space-y-2">
            <li>
              <strong className="text-white">STL (3D Print Ready)</strong>
              <p className="text-gray-400 text-xs mt-0.5">Choose a format in Files, wait for rendering, then tap Download to save it for your slicer.</p>
            </li>
            <li>
              <strong className="text-white">SCAD (Self-contained)</strong>
              <p className="text-gray-400 text-xs mt-0.5">All code inlined - works in OpenSCAD without dependencies</p>
            </li>
            <li>
              <strong className="text-white">SCAD (With Components)</strong>
              <p className="text-gray-400 text-xs mt-0.5">Requires the components/ folder from the project</p>
            </li>
            <li>
              <strong className="text-white">JSON Config</strong>
              <p className="text-gray-400 text-xs mt-0.5">Save your configuration to re-import and edit later</p>
            </li>
            <li>
              <strong className="text-white">Share Link</strong>
              <p className="text-gray-400 text-xs mt-0.5">Generates a URL with your entire config embedded</p>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'shortcuts',
      title: 'Tips & Shortcuts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p className="font-medium text-white">Desktop Keyboard Shortcuts</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-700/50 rounded px-2 py-1.5">
              <kbd className="bg-gray-600 px-1 rounded text-gray-200">Delete</kbd>
              <span className="ml-2">Remove device</span>
            </div>
            <div className="bg-gray-700/50 rounded px-2 py-1.5">
              <kbd className="bg-gray-600 px-1 rounded text-gray-200">Esc</kbd>
              <span className="ml-2">Deselect</span>
            </div>
            <div className="bg-gray-700/50 rounded px-2 py-1.5">
              <kbd className="bg-gray-600 px-1 rounded text-gray-200">Arrows</kbd>
              <span className="ml-2">Nudge 1mm</span>
            </div>
            <div className="bg-gray-700/50 rounded px-2 py-1.5">
              <kbd className="bg-gray-600 px-1 rounded text-gray-200">Shift+Arrows</kbd>
              <span className="ml-1">Nudge 10mm</span>
            </div>
          </div>
          <p className="font-medium text-white mt-3">Mobile Tips</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Tap a device in the library to add it to the rack</li>
            <li>Use the 2D/3D toggle to switch views</li>
            <li>Choose Pan in the editor to pinch to zoom and drag the view</li>
            <li>Pull down on any sheet to dismiss it</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'faq',
      title: 'FAQ',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-medium text-white">What rack standard does this use?</p>
            <p className="text-xs text-gray-400 mt-1">19" EIA-310 standard rack mounting. The default panel width is 482.6mm (19").</p>
          </div>
          <div>
            <p className="font-medium text-white">What are mount types?</p>
            <p className="text-xs text-gray-400 mt-1">Mount types determine how a device cutout is generated: cage (open box), shelf (with lip), patch panel (keystone ports), and more.</p>
          </div>
          <div>
            <p className="font-medium text-white">Can I use split panels?</p>
            <p className="text-xs text-gray-400 mt-1">Yes! Enable Split in Settings to create two-piece panels with joiner hardware. Great for panels wider than your printer bed.</p>
          </div>
          <div>
            <p className="font-medium text-white">How does STL export work?</p>
            <p className="text-xs text-gray-400 mt-1">STL rendering uses OpenSCAD compiled to WebAssembly - it runs entirely in your browser. No server needed!</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedSection === section.id;
          return (
            <div key={section.id} className="rounded-lg overflow-hidden bg-gray-700/30">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors"
              >
                <span className={`transition-colors ${isExpanded ? 'text-blue-400' : 'text-gray-400'}`}>
                  {section.icon}
                </span>
                <span className={`flex-1 text-left text-sm font-medium ${isExpanded ? 'text-white' : 'text-gray-300'}`}>
                  {section.title}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pt-1">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* App info footer */}
      <div className="mt-6 pt-4 border-t border-gray-700 text-center">
        <p className="text-xs text-gray-500">Rack Configurator</p>
        <p className="text-xs text-gray-600 mt-1">19" EIA-310 Rack Panel Designer</p>
      </div>
    </div>
  );
}
