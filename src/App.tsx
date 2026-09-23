import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSANStore } from './store/useStore';
import { DeviceFactory } from './engine/SimulationEngine';
import type { Device, Vendor, DeviceType, Severity } from './types';
import {
  Server, Network, Terminal, Shield, Activity, AlertTriangle,
  Plus, Trash2, Download, Upload, Play, Pause, Settings,
  Database, HardDrive, Monitor, ChevronRight, X, Check,
  Zap, Globe, Layers, FileText, Cpu, BarChart3, BookOpen
} from 'lucide-react';

// ============= Layout Component =============
function Layout({ children }: { children: React.ReactNode }) {
  const { activePage, setActivePage, notifications, clearNotifications } = useSANStore();
  const [showNotifications, setShowNotifications] = useState(false);
  
  const navItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'topology', icon: Network, label: 'Topology' },
    { id: 'devices', icon: Server, label: 'Devices' },
    { id: 'cli', icon: Terminal, label: 'CLI Terminal' },
    { id: 'fabric', icon: Globe, label: 'Fabric' },
    { id: 'zoning', icon: Shield, label: 'Zoning' },
    { id: 'traffic', icon: Activity, label: 'Traffic' },
    { id: 'vsan', icon: Layers, label: 'VSAN' },
    { id: 'events', icon: AlertTriangle, label: 'Events' },
    { id: 'troubleshooting', icon: AlertTriangle, label: 'Troubleshoot' },
    { id: 'automation', icon: Zap, label: 'Automation' },
    { id: 'labs', icon: BookOpen, label: 'Lab Templates' },
    { id: 'config', icon: Settings, label: 'Configuration' },
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <Network className="w-6 h-6" />
            SAN Simulator
          </h1>
          <p className="text-xs text-gray-400 mt-1">Enterprise FC Lab Platform</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                activePage === item.id
                  ? 'bg-emerald-900/30 text-emerald-400 border-r-2 border-emerald-400'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">v1.0.0</span>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1 text-gray-400 hover:text-white"
            >
              <AlertTriangle className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[8px] flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-300 capitalize">{activePage}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Devices: {useSANStore.getState().devices.size} | 
              Fabrics: {useSANStore.getState().fabrics.getAllFabrics().length}
            </span>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
      
      {/* Notifications Panel */}
      {showNotifications && (
        <div className="absolute right-0 top-12 w-80 max-h-96 bg-gray-800 border border-gray-700 rounded-bl-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <span className="text-sm font-medium">Notifications</span>
            <div className="flex gap-2">
              <button onClick={clearNotifications} className="text-xs text-gray-400 hover:text-white">Clear</button>
              <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">No notifications</p>
            ) : (
              notifications.slice().reverse().map(n => (
                <div key={n.id} className={`p-3 border-b border-gray-700/50 text-sm ${
                  n.severity === 'CRITICAL' ? 'bg-red-900/20' :
                  n.severity === 'ERROR' ? 'bg-orange-900/20' :
                  n.severity === 'WARNING' ? 'bg-yellow-900/20' : ''
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      n.severity === 'CRITICAL' ? 'bg-red-500' :
                      n.severity === 'ERROR' ? 'bg-orange-500' :
                      n.severity === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-gray-300">{n.message}</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= Dashboard Page =============
function DashboardPage() {
  const { devices, fabrics, events, vsans } = useSANStore();
  const allFabrics = fabrics.getAllFabrics();
  const allEvents = fabrics.getEvents();
  
  const switchCount = Array.from(devices.values()).filter(d => d.type === 'switch' || d.type === 'director').length;
  const hostCount = Array.from(devices.values()).filter(d => d.type === 'host').length;
  const storageCount = Array.from(devices.values()).filter(d => d.type === 'storage').length;
  
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">SAN Dashboard</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={Server} label="Switches" value={switchCount} color="emerald" />
        <StatCard icon={Monitor} label="Hosts" value={hostCount} color="blue" />
        <StatCard icon={HardDrive} label="Storage" value={storageCount} color="purple" />
        <StatCard icon={Globe} label="Fabrics" value={allFabrics.length} color="cyan" />
        <StatCard icon={Layers} label="VSANs" value={vsans.length} color="orange" />
        <StatCard icon={Activity} label="Events" value={allEvents.length} color="yellow" />
      </div>
      
      {/* Device List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            Devices
          </h3>
          {devices.size === 0 ? (
            <p className="text-gray-500 text-sm">No devices. Load a lab template to get started.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Array.from(devices.values()).map(device => (
                <DeviceRow key={device.id} device={device} />
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-yellow-400" />
            Recent Events
          </h3>
          {allEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No events yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allEvents.slice(-10).reverse().map(event => (
                <div key={event.id} className="flex items-start gap-2 text-sm p-2 bg-gray-700/30 rounded">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    event.severity === 'CRITICAL' ? 'bg-red-500' :
                    event.severity === 'ERROR' ? 'bg-orange-500' :
                    event.severity === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 truncate">{event.message}</p>
                    <p className="text-xs text-gray-500">
                      {event.type} • {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Start Guide */}
      {devices.size === 0 && (
        <div className="bg-gray-800 rounded-lg border border-emerald-700/50 p-6">
          <h3 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Quick Start Guide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span className="font-medium text-sm">Load a Lab Template</span>
              </div>
              <p className="text-xs text-gray-400 ml-8">Go to Lab Templates and load "Single Brocade Switch" to get started with a basic environment.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span className="font-medium text-sm">Open CLI Terminal</span>
              </div>
              <p className="text-xs text-gray-400 ml-8">Select a switch device and use commands like <code className="text-emerald-400">switchshow</code>, <code className="text-emerald-400">nsshow</code>, <code className="text-emerald-400">cfgshow</code>.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span className="font-medium text-sm">Configure Zoning</span>
              </div>
              <p className="text-xs text-gray-400 ml-8">Create aliases, zones, and configurations. Activate the config and verify with <code className="text-emerald-400">cfgactvshow</code>.</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-700/30 rounded text-sm">
            <p className="text-gray-400">
              <span className="font-medium text-white">Tip:</span> The simulator supports both Brocade FOS (7/8/9) and Cisco MDS NX-OS. 
              Try the "Mixed Brocade + Cisco" lab template to explore interoperability.
            </p>
          </div>
        </div>
      )}
      
      {/* Fabric Overview */}
      {allFabrics.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Fabric Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allFabrics.map(fabric => (
              <div key={fabric.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <h4 className="font-medium text-cyan-400">{fabric.name}</h4>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div><span className="text-gray-400">Switches:</span> <span className="text-white">{fabric.switches.length}</span></div>
                  <div><span className="text-gray-400">ISLs:</span> <span className="text-white">{fabric.isls.filter(i => i.state === 'up').length}</span></div>
                  <div><span className="text-gray-400">FLOGI:</span> <span className="text-white">{fabric.flogiDb.length}</span></div>
                  <div><span className="text-gray-400">FCNS:</span> <span className="text-white">{fabric.fcns.length}</span></div>
                  <div><span className="text-gray-400">State:</span> <span className={`text-white ${fabric.state === 'stable' ? 'text-emerald-400' : 'text-yellow-400'}`}>{fabric.state}</span></div>
                  <div><span className="text-gray-400">Domains:</span> <span className="text-white">{fabric.domainIds.join(', ')}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-900/30 border-emerald-800 text-emerald-400',
    blue: 'bg-blue-900/30 border-blue-800 text-blue-400',
    purple: 'bg-purple-900/30 border-purple-800 text-purple-400',
    cyan: 'bg-cyan-900/30 border-cyan-800 text-cyan-400',
    orange: 'bg-orange-900/30 border-orange-800 text-orange-400',
    yellow: 'bg-yellow-900/30 border-yellow-800 text-yellow-400',
  };
  
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <Icon className="w-5 h-5 mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-75">{label}</p>
    </div>
  );
}

function DeviceRow({ device }: { device: Device }) {
  const { selectDevice, setActivePage } = useSANStore();
  
  return (
    <div
      className="flex items-center gap-3 p-2 bg-gray-700/30 rounded cursor-pointer hover:bg-gray-700/50 transition-colors"
      onClick={() => { selectDevice(device.id); setActivePage('devices'); }}
    >
      <span className={`w-2 h-2 rounded-full ${device.enabled ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{device.name}</p>
        <p className="text-xs text-gray-400">
          {device.vendor.toUpperCase()} {device.type} {device.version !== 'N/A' ? `v${device.version}` : ''}
        </p>
      </div>
      <span className="text-xs text-gray-500">
        {device.ports.filter(p => p.state === 'online').length}/{device.ports.length} ports
      </span>
    </div>
  );
}

// ============= Topology Page =============
function TopologyPage() {
  const { devices, fabrics, selectDevice, setActivePage } = useSANStore();
  const allFabrics = fabrics.getAllFabrics();
  const deviceList = Array.from(devices.values());
  
  // Categorize devices
  const switches = deviceList.filter(d => d.type === 'switch' || d.type === 'director');
  const hosts = deviceList.filter(d => d.type === 'host');
  const storage = deviceList.filter(d => d.type === 'storage');
  
  // Build connection map
  const connections: { src: string; dst: string; type: string; state: string; speed: number }[] = [];
  for (const device of deviceList) {
    for (const port of device.ports) {
      if (port.connectedTo) {
        const targetDevice = deviceList.find(d => d.ports.some(p => p.id === port.connectedTo));
        if (targetDevice && device.id < targetDevice.id) {
          connections.push({
            src: device.id,
            dst: targetDevice.id,
            type: port.type === 'E_Port' ? 'ISL' : 'FC',
            state: port.state === 'online' ? 'up' : 'down',
            speed: port.speed,
          });
        }
      }
    }
  }
  
  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SAN Topology</h2>
        <div className="flex gap-2 items-center">
          <span className="px-3 py-1 bg-gray-700 rounded text-xs text-gray-300">
            {deviceList.length} devices
          </span>
          <span className="px-3 py-1 bg-gray-700 rounded text-xs text-gray-300">
            {connections.length} links
          </span>
          <span className="px-3 py-1 bg-gray-700 rounded text-xs text-gray-300">
            {allFabrics.reduce((acc, f) => acc + f.isls.length, 0)} ISLs
          </span>
          <div className="flex gap-2 ml-4">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <div className="w-4 h-0.5 bg-emerald-500 rounded" /> Up
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <div className="w-4 h-0.5 bg-red-500 rounded" /> Down
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <div className="w-4 h-0.5 bg-yellow-500 rounded" /> ISL
            </div>
          </div>
        </div>
      </div>
      
      {deviceList.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Network className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No topology loaded</p>
            <p className="text-gray-500 text-sm mt-2">Load a lab template from the Lab Templates page</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 p-6 overflow-auto">
          <div className="min-w-[800px] min-h-[600px] relative">
            {/* SVG Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {/* We'll draw conceptual lines between rows */}
            </svg>
            
            {/* Hosts row */}
            {hosts.length > 0 && (
              <div className="relative mb-12" style={{ zIndex: 1 }}>
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="w-3 h-3" /> Hosts / HBAs
                </p>
                <div className="flex gap-6 flex-wrap justify-center">
                  {hosts.map(host => (
                    <TopologyNode key={host.id} device={host} />
                  ))}
                </div>
                {/* Connection indicators */}
                {switches.length > 0 && (
                  <div className="flex justify-center mt-3">
                    <div className="flex gap-8">
                      {hosts.map(host => {
                        const hasConnection = host.ports.some(p => p.connectedTo);
                        return (
                          <div key={host.id} className="flex flex-col items-center">
                            <div className={`w-0.5 h-6 ${hasConnection ? 'bg-emerald-500' : 'bg-gray-600 border-l border-dashed'}`} />
                            <div className={`w-1.5 h-1.5 rounded-full ${hasConnection ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Switches row */}
            {switches.length > 0 && (
              <div className="relative mb-8" style={{ zIndex: 1 }}>
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-3 h-3" /> SAN Switches
                </p>
                <div className="flex gap-6 flex-wrap justify-center">
                  {switches.map(sw => (
                    <TopologyNode key={sw.id} device={sw} />
                  ))}
                </div>
                
                {/* ISL indicators between switches */}
                {switches.length > 1 && (
                  <div className="flex justify-center mt-4">
                    <div className="bg-gray-700/50 rounded-lg px-4 py-2 border border-gray-600">
                      <p className="text-xs text-gray-400 mb-1 text-center">Inter-Switch Links</p>
                      <div className="flex gap-2 justify-center">
                        {allFabrics.flatMap(f => f.isls).map(isl => (
                          <div key={isl.id} className="flex flex-col items-center">
                            <div className={`w-10 h-1.5 rounded ${isl.state === 'up' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className="text-[10px] text-gray-500 mt-0.5">{isl.speed}G</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Storage connection indicators */}
            {storage.length > 0 && switches.length > 0 && (
              <div className="flex justify-center my-3">
                <div className="flex gap-8">
                  {storage.map(st => {
                    const hasConnection = st.ports.some(p => p.connectedTo);
                    return (
                      <div key={st.id} className="flex flex-col items-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${hasConnection ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                        <div className={`w-0.5 h-6 ${hasConnection ? 'bg-emerald-500' : 'bg-gray-600 border-l border-dashed'}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Storage row */}
            {storage.length > 0 && (
              <div className="relative" style={{ zIndex: 1 }}>
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <HardDrive className="w-3 h-3" /> Storage Arrays
                </p>
                <div className="flex gap-6 flex-wrap justify-center">
                  {storage.map(st => (
                    <TopologyNode key={st.id} device={st} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Connection Details */}
      {connections.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="font-semibold mb-3">Active Connections</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {connections.map((conn, i) => (
              <div key={i} className="bg-gray-700/30 rounded p-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${conn.state === 'up' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div className="flex-1 text-sm">
                  <p className="font-medium">
                    {deviceList.find(d => d.id === conn.src)?.name} → {deviceList.find(d => d.id === conn.dst)?.name}
                  </p>
                  <p className="text-xs text-gray-400">{conn.type} • {conn.speed}G • {conn.state}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TopologyNode({ device }: { device: Device }) {
  const { selectDevice, setActivePage } = useSANStore();
  
  const vendorColors: Record<string, string> = {
    brocade: 'border-emerald-600 bg-emerald-900/20',
    cisco: 'border-blue-600 bg-blue-900/20',
  };
  
  const typeIcons: Record<string, any> = {
    switch: Server,
    director: Server,
    host: Monitor,
    storage: HardDrive,
  };
  
  const Icon = typeIcons[device.type] || Server;
  
  return (
    <div
      className={`border-2 rounded-lg p-4 cursor-pointer hover:scale-105 transition-transform ${vendorColors[device.vendor] || 'border-gray-600 bg-gray-700/20'}`}
      onClick={() => { selectDevice(device.id); setActivePage('devices'); }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" />
        <span className="font-medium text-sm">{device.name}</span>
      </div>
      <div className="text-xs text-gray-400 space-y-1">
        <p>{device.vendor.toUpperCase()} {device.version !== 'N/A' ? `FOS ${device.version}` : device.type}</p>
        {device.domainId > 0 && <p>Domain: {device.domainId}</p>}
        <p className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${device.enabled ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {device.enabled ? 'Online' : 'Offline'}
        </p>
        <p>Ports: {device.ports.filter(p => p.state === 'online').length}/{device.ports.length}</p>
      </div>
    </div>
  );
}

// ============= Devices Page =============
function DevicesPage() {
  const { devices, selectedDeviceId, selectDevice, addDevice, removeDevice } = useSANStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const selectedDevice = selectedDeviceId ? devices.get(selectedDeviceId) : null;
  
  return (
    <div className="p-6 h-full flex gap-6">
      {/* Device List */}
      <div className="w-80 flex-shrink-0 bg-gray-800 rounded-lg border border-gray-700 flex flex-col">
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold">Devices ({devices.size})</h3>
          <button onClick={() => setShowAddDialog(true)} className="p-1 bg-emerald-600 hover:bg-emerald-500 rounded">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {Array.from(devices.values()).map(device => (
            <div
              key={device.id}
              onClick={() => selectDevice(device.id)}
              className={`p-3 rounded cursor-pointer transition-colors ${
                selectedDeviceId === device.id ? 'bg-emerald-900/30 border border-emerald-700' : 'hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${device.enabled ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="font-medium text-sm">{device.name}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {device.vendor.toUpperCase()} • {device.type} • {device.version !== 'N/A' ? `v${device.version}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Device Detail */}
      <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 overflow-auto">
        {selectedDevice ? (
          <DeviceDetail device={selectedDevice} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a device to view details</p>
          </div>
        )}
      </div>
      
      {/* Add Device Dialog */}
      {showAddDialog && <AddDeviceDialog onClose={() => setShowAddDialog(false)} />}
    </div>
  );
}

function DeviceDetail({ device }: { device: Device }) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">{device.name}</h3>
        <span className={`px-3 py-1 rounded text-xs ${device.enabled ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
          {device.enabled ? 'Online' : 'Offline'}
        </span>
      </div>
      
      {/* Device Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="Vendor" value={device.vendor.toUpperCase()} />
        <InfoCard label="Type" value={device.type} />
        <InfoCard label="Version" value={device.version} />
        <InfoCard label="Domain ID" value={device.domainId.toString()} />
        <InfoCard label="IP Address" value={device.ipAddress || 'N/A'} />
        <InfoCard label="Serial" value={device.serialNumber || 'N/A'} />
        <InfoCard label="WWPN" value={device.mgmtWwpn || 'N/A'} />
        <InfoCard label="Principal" value={device.principalSwitch ? 'Yes' : 'No'} />
      </div>
      
      {/* Ports */}
      <div>
        <h4 className="font-semibold mb-3">Ports ({device.ports.length})</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left p-2">Index</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Speed</th>
                <th className="text-left p-2">State</th>
                <th className="text-left p-2">WWPN</th>
                <th className="text-left p-2">Connected</th>
              </tr>
            </thead>
            <tbody>
              {device.ports.map(port => (
                <tr key={port.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="p-2">{port.index}</td>
                  <td className="p-2 font-mono">{port.name}</td>
                  <td className="p-2">{port.type}</td>
                  <td className="p-2">{port.speed}G</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      port.state === 'online' ? 'bg-emerald-900/50 text-emerald-400' :
                      port.state === 'disabled' ? 'bg-yellow-900/50 text-yellow-400' :
                      port.state === 'faulty' ? 'bg-red-900/50 text-red-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {port.state}
                    </span>
                  </td>
                  <td className="p-2 font-mono text-xs">{port.wwpn || 'N/A'}</td>
                  <td className="p-2">{port.connectedTo ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Zoning */}
      <div>
        <h4 className="font-semibold mb-3">Zoning Configuration</h4>
        <div className="bg-gray-700/30 rounded p-4">
          <p className="text-sm text-gray-400">
            Aliases: {device.config.zoning.aliases.length} | 
            Zones: {device.config.zoning.zones.length} | 
            Configs: {device.config.zoning.configs.length} | 
            Active: {device.config.zoning.activeConfig || 'None'}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-700/30 rounded p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium mt-1">{value}</p>
    </div>
  );
}

function AddDeviceDialog({ onClose }: { onClose: () => void }) {
  const { addDevice } = useSANStore();
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState<Vendor>('brocade');
  const [type, setType] = useState<DeviceType>('switch');
  const [version, setVersion] = useState('9.x');
  const [domainId, setDomainId] = useState(1);
  const [portCount, setPortCount] = useState(8);
  
  const handleCreate = () => {
    if (!name) return;
    let device: Device;
    if (type === 'host') {
      device = DeviceFactory.createHost(name, portCount);
    } else if (type === 'storage') {
      device = DeviceFactory.createStorage(name, portCount);
    } else {
      device = DeviceFactory.createDevice({ name, vendor, type, version, domainId, portCount });
    }
    addDevice(device);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-96">
        <h3 className="text-lg font-bold mb-4">Add Device</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm" placeholder="BRCD01" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400">Vendor</label>
              <select value={vendor} onChange={e => setVendor(e.target.value as Vendor)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm">
                <option value="brocade">Brocade</option>
                <option value="cisco">Cisco</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">Type</label>
              <select value={type} onChange={e => setType(e.target.value as DeviceType)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm">
                <option value="switch">Switch</option>
                <option value="director">Director</option>
                <option value="host">Host</option>
                <option value="storage">Storage</option>
              </select>
            </div>
          </div>
          {(type === 'switch' || type === 'director') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400">Version</label>
                  <select value={version} onChange={e => setVersion(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm">
                    <option value="9.x">FOS 9.x</option>
                    <option value="8.x">FOS 8.x</option>
                    <option value="7.x">FOS 7.x</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Domain ID</label>
                  <input type="number" value={domainId} onChange={e => setDomainId(parseInt(e.target.value))} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm" />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="text-sm text-gray-400">Port Count</label>
            <input type="number" value={portCount} onChange={e => setPortCount(parseInt(e.target.value))} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded">Cancel</button>
          <button onClick={handleCreate} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 rounded">Create</button>
        </div>
      </div>
    </div>
  );
}

// ============= CLI Terminal Page =============
function CLIPage() {
  const { devices, selectedDeviceId, selectDevice, executeCLI, getCLIPrompt, initCLISession, cliSessions } = useSANStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const switchDevices = Array.from(devices.values()).filter(d => d.type === 'switch' || d.type === 'director');
  
  useEffect(() => {
    if (selectedDeviceId) {
      initCLISession(selectedDeviceId);
      const history = cliSessions.get(selectedDeviceId) || [];
      setOutput(history.join('\n'));
    }
  }, [selectedDeviceId]);
  
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId || !input.trim()) return;
    
    const result = executeCLI(selectedDeviceId, input);
    setOutput(prev => prev + `\n${getCLIPrompt(selectedDeviceId)}${input}\n${result}`);
    setInput('');
  };
  
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">CLI Terminal</h2>
        <div className="flex items-center gap-2">
          <select
            value={selectedDeviceId || ''}
            onChange={e => selectDevice(e.target.value || null)}
            className="px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
          >
            <option value="">Select Device...</option>
            {switchDevices.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.vendor.toUpperCase()} {d.version})</option>
            ))}
          </select>
        </div>
      </div>
      
      {!selectedDeviceId ? (
        <div className="flex-1 flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-500">Select a switch device to open CLI terminal</p>
        </div>
      ) : (
        <div
          ref={terminalRef}
          className="flex-1 bg-black rounded-lg border border-gray-700 p-4 font-mono text-sm overflow-y-auto cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
          <form onSubmit={handleSubmit} className="flex items-center mt-1">
            <span className="text-emerald-400">{getCLIPrompt(selectedDeviceId)}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-100 ml-1"
              autoFocus
              spellCheck={false}
            />
          </form>
        </div>
      )}
    </div>
  );
}

// ============= Fabric Page =============
function FabricPage() {
  const { fabrics, devices, selectedFabricId, selectFabric, createFabric, performFLOGI, validateFabric } = useSANStore();
  const allFabrics = fabrics.getAllFabrics();
  const [validationResults, setValidationResults] = useState<any[]>([]);
  
  const selectedFabric = selectedFabricId ? fabrics.getFabric(selectedFabricId) : null;
  
  const handleValidate = () => {
    if (selectedFabricId) {
      const results = validateFabric(selectedFabricId);
      setValidationResults(results);
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Fabric Management</h2>
        <button
          onClick={() => createFabric(`FABRIC_${allFabrics.length + 1}`)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Fabric
        </button>
      </div>
      
      {allFabrics.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No fabrics created</p>
          <p className="text-gray-500 text-sm mt-2">Create a fabric or load a lab template</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Fabric Selector */}
          <div className="flex gap-2 flex-wrap">
            {allFabrics.map(fabric => (
              <button
                key={fabric.id}
                onClick={() => selectFabric(fabric.id)}
                className={`px-4 py-2 rounded text-sm ${
                  selectedFabricId === fabric.id ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {fabric.name}
              </button>
            ))}
          </div>
          
          {selectedFabric && (
            <>
              {/* Fabric Details */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-cyan-400">{selectedFabric.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => performFLOGI(selectedFabric.id)} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs">
                      Run FLOGI
                    </button>
                    <button onClick={handleValidate} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs">
                      Validate
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoCard label="State" value={selectedFabric.state} />
                  <InfoCard label="Switches" value={selectedFabric.switches.length.toString()} />
                  <InfoCard label="ISLs (Up)" value={selectedFabric.isls.filter(i => i.state === 'up').length.toString()} />
                  <InfoCard label="Domain IDs" value={selectedFabric.domainIds.join(', ')} />
                  <InfoCard label="FLOGI Entries" value={selectedFabric.flogiDb.length.toString()} />
                  <InfoCard label="FCNS Entries" value={selectedFabric.fcns.length.toString()} />
                  <InfoCard label="Principal" value={selectedFabric.principalSwitchId ? devices.get(selectedFabric.principalSwitchId)?.name || 'N/A' : 'None'} />
                  <InfoCard label="Total Events" value={selectedFabric.events.length.toString()} />
                </div>
              </div>
              
              {/* ISLs */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <h4 className="font-semibold mb-3">ISLs</h4>
                {selectedFabric.isls.length === 0 ? (
                  <p className="text-gray-500 text-sm">No ISLs configured</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400">
                        <th className="text-left p-2">Source</th>
                        <th className="text-left p-2">Destination</th>
                        <th className="text-left p-2">State</th>
                        <th className="text-left p-2">Speed</th>
                        <th className="text-left p-2">Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFabric.isls.map(isl => (
                        <tr key={isl.id} className="border-b border-gray-700/50">
                          <td className="p-2">{devices.get(isl.srcDeviceId)?.name || isl.srcDeviceId}</td>
                          <td className="p-2">{devices.get(isl.dstDeviceId)?.name || isl.dstDeviceId}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${isl.state === 'up' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                              {isl.state}
                            </span>
                          </td>
                          <td className="p-2">{isl.speed}G</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${isl.utilization > 80 ? 'bg-red-500' : isl.utilization > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${isl.utilization}%` }} />
                              </div>
                              <span className="text-xs">{isl.utilization}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              {/* FLOGI Database */}
              {selectedFabric.flogiDb.length > 0 && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <h4 className="font-semibold mb-3">FLOGI Database</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400">
                        <th className="text-left p-2">WWPN</th>
                        <th className="text-left p-2">FCID</th>
                        <th className="text-left p-2">Device</th>
                        <th className="text-left p-2">Port</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFabric.flogiDb.map((entry, i) => (
                        <tr key={i} className="border-b border-gray-700/50">
                          <td className="p-2 font-mono text-xs">{entry.wwpn}</td>
                          <td className="p-2 font-mono">{entry.fcid}</td>
                          <td className="p-2">{devices.get(entry.deviceId)?.name || entry.deviceId}</td>
                          <td className="p-2">{entry.portIndex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Validation Results */}
              {validationResults.length > 0 && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <h4 className="font-semibold mb-3">Validation Results</h4>
                  <div className="space-y-2">
                    {validationResults.map((result, i) => (
                      <div key={i} className={`flex items-center gap-3 p-2 rounded ${
                        result.status === 'PASS' ? 'bg-emerald-900/20' :
                        result.status === 'FAIL' ? 'bg-red-900/20' : 'bg-yellow-900/20'
                      }`}>
                        {result.status === 'PASS' ? <Check className="w-4 h-4 text-emerald-400" /> :
                         result.status === 'FAIL' ? <X className="w-4 h-4 text-red-400" /> :
                         <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                        <span className="text-sm">
                          <span className="font-medium">[{result.status}]</span> {result.rule}: {result.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============= Zoning Page =============
function ZoningPage() {
  const { devices, selectedDeviceId, selectDevice } = useSANStore();
  const switchDevices = Array.from(devices.values()).filter(d => d.type === 'switch' || d.type === 'director');
  const selectedDevice = selectedDeviceId ? devices.get(selectedDeviceId) : null;
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Zoning Configuration</h2>
        <select
          value={selectedDeviceId || ''}
          onChange={e => selectDevice(e.target.value || null)}
          className="px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
        >
          <option value="">Select Switch...</option>
          {switchDevices.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      
      {!selectedDevice ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Select a switch to view zoning configuration</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Aliases */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              Aliases ({selectedDevice.config.zoning.aliases.length})
            </h4>
            {selectedDevice.config.zoning.aliases.length === 0 ? (
              <p className="text-gray-500 text-sm">No aliases defined. Use CLI to create aliases.</p>
            ) : (
              <div className="space-y-2">
                {selectedDevice.config.zoning.aliases.map((alias, i) => (
                  <div key={i} className="bg-gray-700/30 rounded p-3">
                    <p className="text-sm font-medium text-blue-400">{alias.name}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">{alias.members.join(', ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Zones */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Zones ({selectedDevice.config.zoning.zones.length})
            </h4>
            {selectedDevice.config.zoning.zones.length === 0 ? (
              <p className="text-gray-500 text-sm">No zones defined. Use CLI to create zones.</p>
            ) : (
              <div className="space-y-2">
                {selectedDevice.config.zoning.zones.map((zone, i) => (
                  <div key={i} className="bg-gray-700/30 rounded p-3">
                    <p className="text-sm font-medium text-purple-400">{zone.name}</p>
                    <p className="text-xs text-gray-400 mt-1">Members: {zone.members.join(', ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Configurations */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              Configurations ({selectedDevice.config.zoning.configs.length})
            </h4>
            {selectedDevice.config.zoning.configs.length === 0 ? (
              <p className="text-gray-500 text-sm">No configurations defined.</p>
            ) : (
              <div className="space-y-2">
                {selectedDevice.config.zoning.configs.map((cfg, i) => (
                  <div key={i} className={`rounded p-3 ${cfg.active ? 'bg-emerald-900/20 border border-emerald-700' : 'bg-gray-700/30'}`}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-emerald-400">{cfg.name}</p>
                      {cfg.active && <span className="px-2 py-0.5 bg-emerald-600 rounded text-xs">ACTIVE</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Zones: {cfg.zones.join(', ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Instructions */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h4 className="font-semibold mb-2 text-yellow-400">CLI Commands for Zoning</h4>
            <div className="text-sm text-gray-400 font-mono space-y-1">
              <p>alicreate HOST01_HBA0, "10:00:00:90:fa:aa:bb:01"</p>
              <p>zonecreate HOST01_STORAGE01, "HOST01_HBA0; STORAGE01_P0"</p>
              <p>cfgcreate PROD_CONFIG, "HOST01_STORAGE01"</p>
              <p>cfgenable PROD_CONFIG</p>
              <p>cfgsave</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============= Events Page =============
function EventsPage() {
  const { fabrics, devices } = useSANStore();
  const allEvents = fabrics.getEvents();
  const [filter, setFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'events' | 'frames' | 'logs'>('events');
  
  const filteredEvents = allEvents.filter(e => {
    if (filter !== 'ALL' && e.type !== filter) return false;
    if (severityFilter !== 'ALL' && e.severity !== severityFilter) return false;
    return true;
  });
  
  const eventTypes = ['ALL', ...new Set(allEvents.map(e => e.type))];
  const severities = ['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
  
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Event Log</h2>
      
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700 w-fit">
        <button onClick={() => setActiveTab('events')} className={`px-4 py-2 rounded text-sm ${activeTab === 'events' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          Events ({allEvents.length})
        </button>
        <button onClick={() => setActiveTab('frames')} className={`px-4 py-2 rounded text-sm ${activeTab === 'frames' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          Frame Analyzer
        </button>
        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded text-sm ${activeTab === 'logs' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          Device Logs
        </button>
      </div>
      
      {activeTab === 'events' && (
        <>
      {/* Filters */}
      <div className="flex gap-4">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm">
          {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm">
          {severities.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-sm text-gray-400 self-center">{filteredEvents.length} events</span>
      </div>
      
      {/* Events List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No events</div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {filteredEvents.slice().reverse().map(event => (
              <div key={event.id} className={`flex items-start gap-3 p-3 border-b border-gray-700/50 ${
                event.severity === 'CRITICAL' ? 'bg-red-900/10' :
                event.severity === 'ERROR' ? 'bg-orange-900/10' :
                event.severity === 'WARNING' ? 'bg-yellow-900/10' : ''
              }`}>
                <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  event.severity === 'CRITICAL' ? 'bg-red-500' :
                  event.severity === 'ERROR' ? 'bg-orange-500' :
                  event.severity === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      event.severity === 'CRITICAL' ? 'bg-red-900/50 text-red-400' :
                      event.severity === 'ERROR' ? 'bg-orange-900/50 text-orange-400' :
                      event.severity === 'WARNING' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-blue-900/50 text-blue-400'
                    }`}>{event.severity}</span>
                    <span className="text-xs text-gray-500">{event.type}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{event.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(event.timestamp).toLocaleString()}
                    {event.deviceId && ` • Device: ${event.deviceId.substring(0, 8)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
      
      {/* Frame Analyzer Tab */}
      {activeTab === 'frames' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold">Fibre Channel Frame Analyzer</h3>
            <p className="text-xs text-gray-400 mt-1">Simulated FC frame capture from fabric traffic</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 bg-gray-800">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Timestamp</th>
                  <th className="text-left p-2">Source WWPN</th>
                  <th className="text-left p-2">Dest WWPN</th>
                  <th className="text-left p-2">FCID</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">OX_ID</th>
                  <th className="text-left p-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {allEvents.filter(e => ['FLOGI', 'PLOGI', 'PRLI', 'LOGO', 'RSCN', 'SCR'].includes(e.type)).slice(-20).reverse().map((event, i) => (
                  <tr key={event.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="p-2 text-gray-500">{i + 1}</td>
                    <td className="p-2 text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</td>
                    <td className="p-2 text-emerald-400">10:00:00:90:fa:{Math.floor(Math.random()*255).toString(16).padStart(2,'0')}:{Math.floor(Math.random()*255).toString(16).padStart(2,'0')}:{Math.floor(Math.random()*255).toString(16).padStart(2,'0')}:{Math.floor(Math.random()*255).toString(16).padStart(2,'0')}</td>
                    <td className="p-2 text-blue-400">50:00:00:90:fa:{Math.floor(Math.random()*255).toString(16).padStart(2,'0')}:{Math.floor(Math.random()*255).toString(16).padStart(2,'0')}:{Math.floor(Math.random()*255).toString(16).padStart(2,'0')}:{Math.floor(Math.random()*255).toString(16).padStart(2,'0')}</td>
                    <td className="p-2">{Math.floor(Math.random()*255).toString(16).padStart(2,'0')}{Math.floor(Math.random()*255).toString(16).padStart(2,'0')}01</td>
                    <td className="p-2 text-yellow-400">{event.type}</td>
                    <td className="p-2">{(i * 3 + 1).toString(16).padStart(4, '0')}</td>
                    <td className="p-2 text-emerald-400">SUCCESS</td>
                  </tr>
                ))}
                {allEvents.filter(e => ['FLOGI', 'PLOGI', 'PRLI', 'LOGO', 'RSCN', 'SCR'].includes(e.type)).length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-500">No FC frames captured. Run FLOGI on a fabric to generate traffic.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Device Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold">Device System Logs</h3>
            <p className="text-xs text-gray-400 mt-1">Aggregated logs from all devices</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto p-4 font-mono text-xs space-y-1">
            {Array.from(devices.values()).flatMap(d => 
              d.logs.map(log => ({ ...log, deviceName: d.name }))
            ).sort((a, b) => b.timestamp - a.timestamp).slice(0, 50).map((log, i) => (
              <div key={i} className={`flex gap-2 ${
                log.severity === 'CRITICAL' ? 'text-red-400' :
                log.severity === 'ERROR' ? 'text-orange-400' :
                log.severity === 'WARNING' ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="text-cyan-400">{log.deviceName}</span>
                <span className="text-gray-500">[{log.severity}]</span>
                <span>{log.source}:</span>
                <span>{log.message}</span>
              </div>
            ))}
            {Array.from(devices.values()).every(d => d.logs.length === 0) && (
              <p className="text-gray-500 text-center py-8">No log entries. Execute CLI commands to generate log entries.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= Troubleshooting Page =============
function TroubleshootingPage() {
  const { fabrics, devices, injectFailure } = useSANStore();
  const allFabrics = fabrics.getAllFabrics();
  const [selectedFailure, setSelectedFailure] = useState('');
  const [targetDevice, setTargetDevice] = useState('');
  
  const failureTypes = [
    { id: 'cable_failure', name: 'Cable Failure', desc: 'Simulate physical cable disconnect' },
    { id: 'port_failure', name: 'Port Failure', desc: 'Simulate port hardware failure' },
    { id: 'switch_failure', name: 'Switch Failure', desc: 'Simulate complete switch failure' },
    { id: 'isl_failure', name: 'ISL Failure', desc: 'Simulate inter-switch link failure' },
    { id: 'duplicate_wwpn', name: 'Duplicate WWPN', desc: 'Inject duplicate WWPN condition' },
    { id: 'domain_conflict', name: 'Domain Conflict', desc: 'Inject domain ID conflict' },
    { id: 'link_flapping', name: 'Link Flapping', desc: 'Simulate link flapping condition' },
  ];
  
  const handleInject = () => {
    if (!selectedFailure || !targetDevice || allFabrics.length === 0) return;
    injectFailure(selectedFailure, targetDevice, allFabrics[0].id);
  };
  
  const deviceList = Array.from(devices.values());
  
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Troubleshooting Laboratory</h2>
      
      {/* Failure Injection */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          Failure Injection
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-400">Failure Type</label>
            <select value={selectedFailure} onChange={e => setSelectedFailure(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm">
              <option value="">Select failure...</option>
              {failureTypes.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">Target Device</label>
            <select value={targetDevice} onChange={e => setTargetDevice(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm">
              <option value="">Select device...</option>
              {deviceList.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleInject}
              disabled={!selectedFailure || !targetDevice}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
            >
              Inject Failure
            </button>
          </div>
        </div>
        
        {selectedFailure && (
          <p className="text-xs text-gray-500 mt-2">
            {failureTypes.find(f => f.id === selectedFailure)?.desc}
          </p>
        )}
      </div>
      
      {/* Troubleshooting Scenarios */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">Troubleshooting Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Host Cannot See Storage', desc: 'Investigate why a host cannot access storage LUNs. Check zoning, FLOGI, PLOGI, FCNS, and port states.' },
            { title: 'ISL is Down', desc: 'An ISL between two switches has gone down. Determine the cause and restore connectivity.' },
            { title: 'Fabric Merge Failure', desc: 'Two fabric segments cannot merge. Identify the domain conflict or other incompatibility.' },
            { title: 'Single Path to Storage', desc: 'A host only has one path to storage. Find the missing path and restore redundancy.' },
            { title: 'Duplicate WWPN', desc: 'A duplicate WWPN has been detected. Find the conflict and resolve it.' },
            { title: 'Zone Not Active', desc: 'A zone exists but is not in the active configuration. Activate it and verify connectivity.' },
            { title: 'Mixed Vendor Issue', desc: 'Brocade and Cisco switches have interoperability issues. Diagnose and resolve.' },
          ].map((scenario, i) => (
            <div key={i} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
              <h4 className="font-medium text-sm text-yellow-400">Scenario {i + 1}: {scenario.title}</h4>
              <p className="text-xs text-gray-400 mt-2">{scenario.desc}</p>
              <p className="text-xs text-gray-500 mt-2">Use CLI commands to investigate. Check: switchshow, nsshow, cfgshow, portshow</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============= Automation Page =============
function AutomationPage() {
  const [script, setScript] = useState(`# SAN Automation Script Example
# This script demonstrates the Python-like API

# Get a switch device
switch = lab.get_device("BRCD01")

# Execute CLI commands
result = switch.cli("switchshow")
print(result)

# Create zoning configuration
switch.create_alias("HOST01_HBA0", "10:00:00:90:fa:12:34:01")
switch.create_alias("STORAGE01_P0", "50:00:00:90:fa:56:78:01")

switch.create_zone("HOST01_STORAGE01", [
    "HOST01_HBA0",
    "STORAGE01_P0"
])

switch.create_config("PROD_CONFIG", ["HOST01_STORAGE01"])
switch.activate_config("PROD_CONFIG")

# Verify
flogi_db = switch.cli("nsshow")
print(flogi_db)
`);
  const [output, setOutput] = useState('');
  
  const handleRun = () => {
    setOutput(`[Simulation] Script parsed successfully.
[Simulation] Commands would be executed against simulated devices.
[Simulation] In a full deployment, this connects to the REST API.

# REST API Endpoints:
GET    /api/devices
POST   /api/devices
GET    /api/fabrics
POST   /api/fabrics
GET    /api/zones
POST   /api/zones
POST   /api/simulation/flogi
POST   /api/failures/inject
GET    /api/events

# WebSocket:
ws://localhost:8000/ws/events
ws://localhost:8000/ws/cli/{deviceId}
`);
  };
  
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Automation & API</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Script Editor */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="font-semibold mb-3">Script Editor</h3>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            className="w-full h-80 bg-black rounded p-3 font-mono text-sm text-green-400 border border-gray-700 resize-none"
            spellCheck={false}
          />
          <button onClick={handleRun} className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm flex items-center gap-2">
            <Play className="w-4 h-4" /> Run Script
          </button>
        </div>
        
        {/* Output */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="font-semibold mb-3">Output</h3>
          <pre className="w-full h-80 bg-black rounded p-3 font-mono text-sm text-gray-300 border border-gray-700 overflow-auto whitespace-pre-wrap">
            {output || 'Run a script to see output here...'}
          </pre>
        </div>
      </div>
      
      {/* API Documentation */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">REST API Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium text-emerald-400">Devices</h4>
            <p className="font-mono text-xs text-gray-400">GET    /api/devices</p>
            <p className="font-mono text-xs text-gray-400">POST   /api/devices</p>
            <p className="font-mono text-xs text-gray-400">GET    /api/devices/:id</p>
            <p className="font-mono text-xs text-gray-400">DELETE /api/devices/:id</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-blue-400">Fabrics</h4>
            <p className="font-mono text-xs text-gray-400">GET    /api/fabrics</p>
            <p className="font-mono text-xs text-gray-400">POST   /api/fabrics</p>
            <p className="font-mono text-xs text-gray-400">POST   /api/fabrics/:id/isl</p>
            <p className="font-mono text-xs text-gray-400">POST   /api/fabrics/:id/flogi</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-purple-400">Zoning</h4>
            <p className="font-mono text-xs text-gray-400">GET    /api/zones</p>
            <p className="font-mono text-xs text-gray-400">POST   /api/zones</p>
            <p className="font-mono text-xs text-gray-400">POST   /api/zones/activate</p>
            <p className="font-mono text-xs text-gray-400">GET    /api/aliases</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-orange-400">Simulation</h4>
            <p className="font-mono text-xs text-gray-400">POST   /api/simulation/start</p>
            <p className="font-mono text-xs text-gray-400">POST   /api/simulation/stop</p>
            <p className="font-mono text-xs text-gray-400">POST   /api/failures/inject</p>
            <p className="font-mono text-xs text-gray-400">GET    /api/events</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= Labs Page =============
function LabsPage() {
  const { loadLabTemplate } = useSANStore();
  
  const labs = [
    { id: 'single-brocade', name: 'Single Brocade Switch', difficulty: 'beginner', desc: 'Learn basic SAN concepts with a single switch.' },
    { id: 'dual-brocade', name: 'Dual Brocade Fabric', difficulty: 'intermediate', desc: 'Two switches connected via ISL forming a fabric.' },
    { id: 'mixed-vendor', name: 'Mixed Brocade + Cisco', difficulty: 'advanced', desc: 'Mixed vendor fabric with interoperability challenges.' },
    { id: 'dual-fabric', name: 'Dual Fabric SAN', difficulty: 'advanced', desc: 'Two independent fabrics for redundancy.' },
    { id: 'cisco-vsan', name: 'Cisco VSAN Environment', difficulty: 'intermediate', desc: 'Cisco MDS switches with VSAN segmentation.' },
  ];
  
  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-900/50 text-green-400',
    intermediate: 'bg-blue-900/50 text-blue-400',
    advanced: 'bg-purple-900/50 text-purple-400',
    expert: 'bg-red-900/50 text-red-400',
  };
  
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Lab Templates</h2>
      <p className="text-gray-400">Load a pre-configured lab environment to start learning and practicing.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {labs.map(lab => (
          <div key={lab.id} className="bg-gray-800 rounded-lg border border-gray-700 p-5 hover:border-emerald-600 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{lab.name}</h3>
              <span className={`px-2 py-0.5 rounded text-xs ${difficultyColors[lab.difficulty]}`}>
                {lab.difficulty}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4">{lab.desc}</p>
            <button
              onClick={() => loadLabTemplate(lab.id)}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm"
            >
              Load Lab
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= Configuration Page =============
function ConfigPage() {
  const { exportLab, importLab, devices } = useSANStore();
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  
  const handleExport = () => {
    const json = exportLab();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `san-lab-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleImport = () => {
    if (importText.trim()) {
      importLab(importText);
      setImportText('');
      setShowImport(false);
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Configuration Management</h2>
      
      {/* Export/Import */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            Export Lab
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Export the entire lab configuration including topology, devices, zoning, and fabric state.
          </p>
          <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm">
            Export as JSON
          </button>
        </div>
        
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            Import Lab
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Import a previously exported lab configuration.
          </p>
          {!showImport ? (
            <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm">
              Import from JSON
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                className="w-full h-32 bg-black rounded p-3 font-mono text-xs text-gray-300 border border-gray-700"
                placeholder="Paste JSON here..."
              />
              <div className="flex gap-2">
                <button onClick={handleImport} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm">Import</button>
                <button onClick={() => setShowImport(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Configuration Diff */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          Configuration Diff
        </h3>
        <p className="text-sm text-gray-400 mb-4">Compare running configuration between two switches or check for changes.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Switch A</label>
            <select className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm">
              <option>Select switch...</option>
              {Array.from(devices.values()).filter(d => d.type === 'switch' || d.type === 'director').map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">Switch B</label>
            <select className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm">
              <option>Select switch...</option>
              {Array.from(devices.values()).filter(d => d.type === 'switch' || d.type === 'director').map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 bg-black rounded p-4 font-mono text-xs overflow-x-auto">
          <p className="text-gray-500"># Select two switches above to compare configurations</p>
          <p className="text-gray-500"># Differences will be shown with +/- markers</p>
          <p className="text-gray-500"> </p>
          <p className="text-emerald-400">+ hostname BRCD01</p>
          <p className="text-red-400">- hostname BRCD02</p>
          <p className="text-gray-300">  switchType: 162.0</p>
          <p className="text-gray-300">  switchState: Online</p>
          <p className="text-emerald-400">+ switchDomain: 1</p>
          <p className="text-red-400">- switchDomain: 2</p>
        </div>
      </div>
      
      {/* Vendor Translation */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          Vendor Configuration Translation
        </h3>
        <p className="text-sm text-gray-400 mb-4">Translate configuration commands between Brocade FOS and Cisco NX-OS.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/30 rounded p-4">
            <h4 className="text-sm font-medium text-emerald-400 mb-2">Brocade FOS</h4>
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{`alicreate HOST01_HBA0, "10:00:00:90:fa:12:34:01"
zonecreate HOST01_STOR01, "HOST01_HBA0; STOR01_P0"
cfgcreate PROD_CFG, "HOST01_STOR01"
cfgenable PROD_CFG
cfgsave`}</pre>
          </div>
          <div className="bg-black/30 rounded p-4">
            <h4 className="text-sm font-medium text-blue-400 mb-2">Cisco NX-OS Equivalent</h4>
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{`device-alias name HOST01_HBA0 pwwn 10:00:00:90:fa:12:34:01
zone name HOST01_STOR01 vsan 10
  member pwwn 10:00:00:90:fa:12:34:01
zoneset name PROD_CFG vsan 10
  member HOST01_STOR01
zoneset activate name PROD_CFG vsan 10
copy running-config startup-config`}</pre>
          </div>
        </div>
      </div>
      
      {/* System Info */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">System Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <InfoCard label="Version" value="1.0.0" />
          <InfoCard label="Devices" value={devices.size.toString()} />
          <InfoCard label="Engine" value="TypeScript" />
          <InfoCard label="UI Framework" value="React" />
        </div>
      </div>
      
      {/* Supported Platforms */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">Supported Platforms</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-emerald-400 mb-2">Brocade</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Fabric OS 7.x</li>
              <li>• Fabric OS 8.x</li>
              <li>• Fabric OS 9.x</li>
              <li>• Switches, Directors, Access Gateways</li>
              <li>• Virtual Fabrics, NPIV, Trunking</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-400 mb-2">Cisco</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• MDS NX-OS 8.x</li>
              <li>• MDS NX-OS 9.x</li>
              <li>• MDS NX-OS 10.x</li>
              <li>• MDS 9100/9200/9300/9500 Series</li>
              <li>• VSAN, NPV, Port Channels</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= Traffic Page =============
function TrafficPage() {
  const { devices, fabrics, traffic } = useSANStore();
  const allFabrics = fabrics.getAllFabrics();
  const flows = traffic.getFlows();
  const deviceList = Array.from(devices.values());
  const hosts = deviceList.filter(d => d.type === 'host');
  const storageDevices = deviceList.filter(d => d.type === 'storage');
  
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">SAN Traffic Monitoring</h2>
      
      {/* Traffic Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Active Flows" value={flows.length} color="emerald" />
        <StatCard icon={BarChart3} label="Total IOPS" value={flows.reduce((a, f) => a + f.iops, 0)} color="blue" />
        <StatCard icon={Zap} label="Throughput" value={Math.round(flows.reduce((a, f) => a + f.throughputMbps, 0))} color="purple" />
        <StatCard icon={AlertTriangle} label="Avg Latency" value={flows.length > 0 ? Math.round(flows.reduce((a, f) => a + f.latency, 0) / flows.length * 10) / 10 : 0} color="yellow" />
      </div>
      
      {/* ISL Traffic */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-4">ISL Traffic & Utilization</h3>
        {allFabrics.flatMap(f => f.isls).length === 0 ? (
          <p className="text-gray-500 text-sm">No ISLs configured. Load a lab template to see traffic.</p>
        ) : (
          <div className="space-y-3">
            {allFabrics.flatMap(f => f.isls).map(isl => (
              <div key={isl.id} className="bg-gray-700/30 rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {devices.get(isl.srcDeviceId)?.name || 'Unknown'} ↔ {devices.get(isl.dstDeviceId)?.name || 'Unknown'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${isl.state === 'up' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                    {isl.state}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Speed</p>
                    <p className="font-medium">{isl.speed} Gbps</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Utilization</p>
                    <p className="font-medium">{isl.utilization}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Est. IOPS</p>
                    <p className="font-medium">{Math.floor(isl.speed * 1000 * isl.utilization / 100)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Est. Throughput</p>
                    <p className="font-medium">{Math.floor(isl.speed * isl.utilization / 100 * 1000)} MB/s</p>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isl.utilization > 80 ? 'bg-red-500' :
                        isl.utilization > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${isl.utilization}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Port Statistics */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-4">Port Statistics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left p-2">Device</th>
                <th className="text-left p-2">Port</th>
                <th className="text-left p-2">Speed</th>
                <th className="text-left p-2">State</th>
                <th className="text-left p-2">CRC Errors</th>
                <th className="text-left p-2">Enc In/Out</th>
                <th className="text-left p-2">Disc C3</th>
              </tr>
            </thead>
            <tbody>
              {deviceList.filter(d => d.type !== 'host' && d.type !== 'storage').flatMap(device =>
                device.ports.slice(0, 4).map(port => (
                  <tr key={`${device.id}-${port.id}`} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="p-2 font-medium">{device.name}</td>
                    <td className="p-2 font-mono text-xs">{port.name}</td>
                    <td className="p-2">{port.speed}G</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        port.state === 'online' ? 'bg-emerald-900/50 text-emerald-400' :
                        port.state === 'disabled' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>{port.state}</span>
                    </td>
                    <td className="p-2 font-mono text-xs">{port.errors.crcErr}</td>
                    <td className="p-2 font-mono text-xs">{port.errors.encIn}/{port.errors.encOut}</td>
                    <td className="p-2 font-mono text-xs">{port.errors.discC3}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============= VSAN Page =============
function VSANPage() {
  const { devices, vsans, createVSAN, fabrics } = useSANStore();
  const allFabrics = fabrics.getAllFabrics();
  const switchDevices = Array.from(devices.values()).filter(d => d.type === 'switch' || d.type === 'director');
  const [showCreate, setShowCreate] = useState(false);
  const [newVsanId, setNewVsanId] = useState(10);
  const [newVsanName, setNewVsanName] = useState('');
  const [newVsanDesc, setNewVsanDesc] = useState('');
  
  const handleCreate = () => {
    if (!newVsanName) return;
    createVSAN({
      id: newVsanId,
      name: newVsanName,
      description: newVsanDesc,
      fabricId: allFabrics[0]?.id || '',
      switches: [],
      interfaces: [],
      zones: { aliases: [], zones: [], configs: [] },
      fcns: [],
      flogiDb: [],
    });
    setShowCreate(false);
    setNewVsanName('');
    setNewVsanDesc('');
    setNewVsanId(prev => prev + 10);
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">VSAN Management</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create VSAN
        </button>
      </div>
      
      {/* Create VSAN Form */}
      {showCreate && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="font-semibold mb-3">Create New VSAN</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400">VSAN ID</label>
              <input type="number" value={newVsanId} onChange={e => setNewVsanId(parseInt(e.target.value))} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-400">Name</label>
              <input value={newVsanName} onChange={e => setNewVsanName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm" placeholder="Production" />
            </div>
            <div>
              <label className="text-sm text-gray-400">Description</label>
              <input value={newVsanDesc} onChange={e => setNewVsanDesc(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm" placeholder="Production VSAN" />
            </div>
          </div>
          <button onClick={handleCreate} className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm">Create</button>
        </div>
      )}
      
      {/* VSAN List */}
      {vsans.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
          <Layers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No VSANs configured</p>
          <p className="text-gray-500 text-sm mt-2">VSANs are used in Cisco MDS environments to segment fabrics</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vsans.map(vsan => (
            <div key={vsan.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400">VSAN {vsan.id}: {vsan.name}</h3>
                  <p className="text-sm text-gray-400">{vsan.description}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-900/50 text-emerald-400 rounded text-xs">Active</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <InfoCard label="Switches" value={vsan.switches.length.toString()} />
                <InfoCard label="Interfaces" value={vsan.interfaces.length.toString()} />
                <InfoCard label="Zones" value={vsan.zones.zones.length.toString()} />
                <InfoCard label="FLOGI" value={vsan.flogiDb.length.toString()} />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* VSAN Info */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">VSAN Concepts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <h4 className="font-medium text-white mb-2">What is a VSAN?</h4>
            <p>Virtual SAN (VSAN) provides fabric segmentation within a physical SAN infrastructure. Each VSAN operates as an independent logical fabric with its own:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Domain IDs</li>
              <li>Zoning configuration</li>
              <li>Name server (FCNS)</li>
              <li>FLOGI database</li>
              <li>Fabric services</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">Cisco CLI Commands</h4>
            <div className="font-mono text-xs space-y-1 bg-black/30 rounded p-3">
              <p>configure terminal</p>
              <p>vsan database</p>
              <p>  vsan 10</p>
              <p>  vsan 10 interface fc1/1</p>
              <p>  exit</p>
              <p>  </p>
              <p>show vsan</p>
              <p>show vsan membership</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= Main App =============
export default function App() {
  const { activePage } = useSANStore();
  
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'topology': return <TopologyPage />;
      case 'devices': return <DevicesPage />;
      case 'cli': return <CLIPage />;
      case 'fabric': return <FabricPage />;
      case 'zoning': return <ZoningPage />;
      case 'traffic': return <TrafficPage />;
      case 'vsan': return <VSANPage />;
      case 'events': return <EventsPage />;
      case 'troubleshooting': return <TroubleshootingPage />;
      case 'automation': return <AutomationPage />;
      case 'labs': return <LabsPage />;
      case 'config': return <ConfigPage />;
      default: return <DashboardPage />;
    }
  };
  
  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}
