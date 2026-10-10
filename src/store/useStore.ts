import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Device, Fabric, ISL, SimEvent, VSAN, TrafficFlow,
  FailureScenario, ValidationResult, TopologyNode, TopologyEdge,
  Vendor, DeviceType, Severity, LabTemplate
} from '../types';
import {
  DeviceFactory, FabricEngine, ZoningEngine, TrafficEngine,
  FailureEngine, WWNGenerator, LabExporter
} from '../engine/SimulationEngine';
import { CLIEngine } from '../engine/CLIEngine';

interface SANStore {
  // Core state
  devices: Map<string, Device>;
  fabrics: FabricEngine;
  traffic: TrafficEngine;
  cliEngine: CLIEngine;
  events: SimEvent[];
  vsans: VSAN[];
  
  // UI state
  selectedDeviceId: string | null;
  selectedFabricId: string | null;
  activePage: string;
  cliSessions: Map<string, string[]>;
  notifications: { id: string; message: string; severity: Severity; timestamp: number }[];
  
  // Actions
  setActivePage: (page: string) => void;
  addDevice: (device: Device) => void;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  selectDevice: (id: string | null) => void;
  selectFabric: (id: string | null) => void;
  
  // Fabric operations
  createFabric: (name: string) => Fabric;
  deleteFabric: (id: string) => void;
  addSwitchToFabric: (fabricId: string, deviceId: string) => void;
  createISL: (fabricId: string, srcDeviceId: string, srcPort: string, dstDeviceId: string, dstPort: string) => void;
  removeISL: (fabricId: string, islId: string) => void;
  performFLOGI: (fabricId: string) => void;
  validateFabric: (fabricId: string) => ValidationResult[];
  
  // Zoning operations
  createAlias: (deviceId: string, name: string, members: string[]) => void;
  createZone: (deviceId: string, name: string, members: string[]) => void;
  activateConfig: (deviceId: string, name: string) => void;
  
  // CLI operations
  executeCLI: (deviceId: string, command: string) => string;
  getCLIPrompt: (deviceId: string) => string;
  initCLISession: (deviceId: string) => void;
  
  // Failure operations
  injectFailure: (type: string, target: string, fabricId: string) => void;
  
  // Traffic operations
  addTrafficFlow: (flow: TrafficFlow) => void;
  
  // VSAN operations
  createVSAN: (vsan: VSAN) => void;
  
  // Import/Export
  exportLab: () => string;
  importLab: (json: string) => void;
  
  // Lab templates
  loadLabTemplate: (templateId: string) => void;
  
  // Notifications
  addNotification: (message: string, severity: Severity) => void;
  clearNotifications: () => void;
}

// Lab templates
const labTemplates: LabTemplate[] = [
  {
    id: 'single-brocade',
    name: 'Single Brocade Switch',
    description: 'A single Brocade G620 switch with FOS 9.x. Perfect for learning basic SAN concepts.',
    difficulty: 'beginner',
    topology: {
      devices: [
        { name: 'BRCD01', vendor: 'brocade', type: 'switch', version: '9.x', domainId: 1, portCount: 8 },
        { name: 'HOST01', vendor: 'brocade', type: 'host', version: 'N/A', domainId: 0, portCount: 2 },
        { name: 'STORAGE01', vendor: 'brocade', type: 'storage', version: 'N/A', domainId: 0, portCount: 4 },
      ],
      links: [
        { srcDevice: 'HOST01', srcPort: 0, dstDevice: 'BRCD01', dstPort: 2, type: 'FC', speed: 16 },
        { srcDevice: 'STORAGE01', srcPort: 0, dstDevice: 'BRCD01', dstPort: 4, type: 'FC', speed: 32 },
      ],
    },
    objectives: [
      'Configure the switch',
      'Create aliases for host and storage',
      'Create a zone',
      'Activate zoning configuration',
      'Verify FLOGI and FCNS',
    ],
  },
  {
    id: 'dual-brocade',
    name: 'Dual Brocade Fabric',
    description: 'Two Brocade switches connected via ISL forming a fabric.',
    difficulty: 'intermediate',
    topology: {
      devices: [
        { name: 'BRCD01', vendor: 'brocade', type: 'switch', version: '9.x', domainId: 1, portCount: 8 },
        { name: 'BRCD02', vendor: 'brocade', type: 'switch', version: '9.x', domainId: 2, portCount: 8 },
        { name: 'HOST01', vendor: 'brocade', type: 'host', version: 'N/A', domainId: 0, portCount: 2 },
        { name: 'STORAGE01', vendor: 'brocade', type: 'storage', version: 'N/A', domainId: 0, portCount: 4 },
      ],
      links: [
        { srcDevice: 'BRCD01', srcPort: 0, dstDevice: 'BRCD02', dstPort: 0, type: 'ISL', speed: 32 },
        { srcDevice: 'BRCD01', srcPort: 1, dstDevice: 'BRCD02', dstPort: 1, type: 'ISL', speed: 32 },
        { srcDevice: 'HOST01', srcPort: 0, dstDevice: 'BRCD01', dstPort: 2, type: 'FC', speed: 16 },
        { srcDevice: 'STORAGE01', srcPort: 0, dstDevice: 'BRCD02', dstPort: 4, type: 'FC', speed: 32 },
      ],
    },
    objectives: [
      'Verify fabric formation',
      'Check principal switch election',
      'Configure zoning across fabric',
      'Test ISL failover',
    ],
  },
  {
    id: 'mixed-vendor',
    name: 'Mixed Brocade + Cisco Fabric',
    description: 'Mixed vendor fabric with Brocade and Cisco MDS switches.',
    difficulty: 'advanced',
    topology: {
      devices: [
        { name: 'BRCD01', vendor: 'brocade', type: 'switch', version: '9.x', domainId: 1, portCount: 8 },
        { name: 'CISCO01', vendor: 'cisco', type: 'switch', version: '9.x', domainId: 2, portCount: 8 },
        { name: 'BRCD02', vendor: 'brocade', type: 'switch', version: '8.x', domainId: 3, portCount: 8 },
        { name: 'HOST01', vendor: 'brocade', type: 'host', version: 'N/A', domainId: 0, portCount: 2 },
        { name: 'STORAGE01', vendor: 'brocade', type: 'storage', version: 'N/A', domainId: 0, portCount: 4 },
      ],
      links: [
        { srcDevice: 'BRCD01', srcPort: 0, dstDevice: 'CISCO01', dstPort: 0, type: 'ISL', speed: 16 },
        { srcDevice: 'CISCO01', srcPort: 2, dstDevice: 'BRCD02', dstPort: 0, type: 'ISL', speed: 16 },
        { srcDevice: 'HOST01', srcPort: 0, dstDevice: 'BRCD01', dstPort: 2, type: 'FC', speed: 16 },
        { srcDevice: 'STORAGE01', srcPort: 0, dstDevice: 'BRCD02', dstPort: 4, type: 'FC', speed: 32 },
      ],
    },
    objectives: [
      'Verify mixed-vendor fabric formation',
      'Configure zoning on both platforms',
      'Test interoperability',
      'Identify vendor-specific differences',
    ],
  },
  {
    id: 'dual-fabric',
    name: 'Dual Fabric SAN',
    description: 'Two independent fabrics for redundancy (Fabric A and Fabric B).',
    difficulty: 'advanced',
    topology: {
      devices: [
        { name: 'FAB_A_SW1', vendor: 'brocade', type: 'switch', version: '9.x', domainId: 1, portCount: 8 },
        { name: 'FAB_A_SW2', vendor: 'brocade', type: 'switch', version: '9.x', domainId: 2, portCount: 8 },
        { name: 'FAB_B_SW1', vendor: 'brocade', type: 'switch', version: '9.x', domainId: 3, portCount: 8 },
        { name: 'FAB_B_SW2', vendor: 'brocade', type: 'switch', version: '9.x', domainId: 4, portCount: 8 },
        { name: 'HOST01', vendor: 'brocade', type: 'host', version: 'N/A', domainId: 0, portCount: 4 },
        { name: 'STORAGE01', vendor: 'brocade', type: 'storage', version: 'N/A', domainId: 0, portCount: 8 },
      ],
      links: [
        { srcDevice: 'FAB_A_SW1', srcPort: 0, dstDevice: 'FAB_A_SW2', dstPort: 0, type: 'ISL', speed: 32 },
        { srcDevice: 'FAB_B_SW1', srcPort: 0, dstDevice: 'FAB_B_SW2', dstPort: 0, type: 'ISL', speed: 32 },
        { srcDevice: 'HOST01', srcPort: 0, dstDevice: 'FAB_A_SW1', dstPort: 2, type: 'FC', speed: 16 },
        { srcDevice: 'HOST01', srcPort: 1, dstDevice: 'FAB_B_SW1', dstPort: 2, type: 'FC', speed: 16 },
        { srcDevice: 'STORAGE01', srcPort: 0, dstDevice: 'FAB_A_SW2', dstPort: 4, type: 'FC', speed: 32 },
        { srcDevice: 'STORAGE01', srcPort: 1, dstDevice: 'FAB_B_SW2', dstPort: 4, type: 'FC', speed: 32 },
      ],
    },
    objectives: [
      'Configure two independent fabrics',
      'Set up multipathing from host to storage',
      'Test fabric failover',
      'Verify path redundancy',
    ],
  },
  {
    id: 'cisco-vsan',
    name: 'Cisco VSAN Environment',
    description: 'Cisco MDS switches with multiple VSANs for fabric segmentation.',
    difficulty: 'intermediate',
    topology: {
      devices: [
        { name: 'MDS01', vendor: 'cisco', type: 'switch', version: '9.x', domainId: 1, portCount: 12 },
        { name: 'MDS02', vendor: 'cisco', type: 'switch', version: '9.x', domainId: 2, portCount: 12 },
        { name: 'HOST01', vendor: 'brocade', type: 'host', version: 'N/A', domainId: 0, portCount: 2 },
        { name: 'HOST02', vendor: 'brocade', type: 'host', version: 'N/A', domainId: 0, portCount: 2 },
        { name: 'STORAGE01', vendor: 'brocade', type: 'storage', version: 'N/A', domainId: 0, portCount: 4 },
        { name: 'STORAGE02', vendor: 'brocade', type: 'storage', version: 'N/A', domainId: 0, portCount: 4 },
      ],
      links: [
        { srcDevice: 'MDS01', srcPort: 0, dstDevice: 'MDS02', dstPort: 0, type: 'ISL', speed: 32 },
        { srcDevice: 'HOST01', srcPort: 0, dstDevice: 'MDS01', dstPort: 2, type: 'FC', speed: 16 },
        { srcDevice: 'HOST02', srcPort: 0, dstDevice: 'MDS01', dstPort: 3, type: 'FC', speed: 16 },
        { srcDevice: 'STORAGE01', srcPort: 0, dstDevice: 'MDS02', dstPort: 4, type: 'FC', speed: 32 },
        { srcDevice: 'STORAGE02', srcPort: 0, dstDevice: 'MDS02', dstPort: 5, type: 'FC', speed: 32 },
      ],
    },
    objectives: [
      'Create multiple VSANs',
      'Configure VSAN membership',
      'Set up per-VSAN zoning',
      'Verify VSAN isolation',
    ],
  },
];

export const useSANStore = create<SANStore>((set, get) => ({
  // Initial state
  devices: new Map(),
  fabrics: new FabricEngine(),
  traffic: new TrafficEngine(),
  cliEngine: new CLIEngine(),
  events: [],
  vsans: [],
  selectedDeviceId: null,
  selectedFabricId: null,
  activePage: 'dashboard',
  cliSessions: new Map(),
  notifications: [],
  
  // UI actions
  setActivePage: (page) => set({ activePage: page }),
  selectDevice: (id) => set({ selectedDeviceId: id }),
  selectFabric: (id) => set({ selectedFabricId: id }),
  
  addDevice: (device) => {
    const devices = new Map(get().devices);
    devices.set(device.id, device);
    set({ devices });
  },
  
  removeDevice: (id) => {
    const devices = new Map(get().devices);
    devices.delete(id);
    set({ devices });
  },
  
  updateDevice: (id, updates) => {
    const devices = new Map(get().devices);
    const device = devices.get(id);
    if (device) {
      devices.set(id, { ...device, ...updates });
      set({ devices });
    }
  },
  
  // Fabric operations
  createFabric: (name) => {
    const fabric = get().fabrics.createFabric(name);
    set({ selectedFabricId: fabric.id });
    return fabric;
  },
  
  deleteFabric: (id) => {
    get().fabrics.deleteFabric(id);
    if (get().selectedFabricId === id) set({ selectedFabricId: null });
  },
  
  addSwitchToFabric: (fabricId, deviceId) => {
    const device = get().devices.get(deviceId);
    if (!device) return;
    get().fabrics.addSwitchToFabric(fabricId, deviceId, device.domainId);
    const updatedDevice = { ...device, fabricId };
    const devices = new Map(get().devices);
    devices.set(deviceId, updatedDevice);
    set({ devices });
    get().addNotification(`${device.name} added to fabric`, 'INFO');
  },
  
  createISL: (fabricId, srcDeviceId, srcPort, dstDeviceId, dstPort) => {
    const isl: ISL = {
      id: uuidv4(),
      srcDeviceId,
      srcPort,
      dstDeviceId,
      dstPort,
      state: 'up',
      speed: 32,
      utilization: Math.floor(Math.random() * 30) + 10,
    };
    get().fabrics.addISL(fabricId, isl);
    get().addNotification(`ISL created between ${srcDeviceId} and ${dstDeviceId}`, 'INFO');
  },
  
  removeISL: (fabricId, islId) => {
    get().fabrics.removeISL(fabricId, islId);
  },
  
  performFLOGI: (fabricId) => {
    get().fabrics.performFLOGI(get().devices, fabricId);
    get().addNotification('FLOGI process completed', 'INFO');
  },
  
  validateFabric: (fabricId) => {
    return get().fabrics.validateFabric(fabricId, get().devices);
  },
  
  // Zoning operations
  createAlias: (deviceId, name, members) => {
    const device = get().devices.get(deviceId);
    if (!device) return;
    ZoningEngine.createAlias(device.config.zoning, name, members);
    const devices = new Map(get().devices);
    devices.set(deviceId, device);
    set({ devices });
    get().addNotification(`Alias "${name}" created on ${device.name}`, 'INFO');
  },
  
  createZone: (deviceId, name, members) => {
    const device = get().devices.get(deviceId);
    if (!device) return;
    ZoningEngine.createZone(device.config.zoning, name, members);
    const devices = new Map(get().devices);
    devices.set(deviceId, device);
    set({ devices });
    get().addNotification(`Zone "${name}" created on ${device.name}`, 'INFO');
  },
  
  activateConfig: (deviceId, name) => {
    const device = get().devices.get(deviceId);
    if (!device) return;
    ZoningEngine.activateConfig(device.config.zoning, name);
    const devices = new Map(get().devices);
    devices.set(deviceId, device);
    set({ devices });
    get().addNotification(`Configuration "${name}" activated on ${device.name}`, 'INFO');
  },
  
  // CLI operations
  executeCLI: (deviceId, command) => {
    const result = get().cliEngine.execute(deviceId, command);
    const sessions = new Map(get().cliSessions);
    const history = sessions.get(deviceId) || [];
    history.push(`> ${command}\n${result.output}`);
    sessions.set(deviceId, history);
    set({ cliSessions: sessions });
    return result.output;
  },
  
  getCLIPrompt: (deviceId) => {
    return get().cliEngine.getPrompt(deviceId);
  },
  
  initCLISession: (deviceId) => {
    const device = get().devices.get(deviceId);
    if (!device) return;
    get().cliEngine.createSession(device);
    const sessions = new Map(get().cliSessions);
    sessions.set(deviceId, [`Connected to ${device.name} (${device.vendor.toUpperCase()} ${device.version})\n${get().cliEngine.getPrompt(deviceId)}`]);
    set({ cliSessions: sessions });
  },
  
  // Failure operations
  injectFailure: (type, target, fabricId) => {
    FailureEngine.injectFailure(type, target, get().devices, get().fabrics, fabricId);
    get().addNotification(`Failure injected: ${type} on ${target}`, 'ERROR');
  },
  
  // Traffic operations
  addTrafficFlow: (flow) => {
    get().traffic.addFlow(flow);
  },
  
  // VSAN operations
  createVSAN: (vsan) => {
    set({ vsans: [...get().vsans, vsan] });
  },
  
  // Import/Export
  exportLab: () => {
    const fabrics = get().fabrics.getAllFabrics();
    return LabExporter.exportLab(get().devices, fabrics, get().vsans);
  },
  
  importLab: (json) => {
    try {
      const lab = LabExporter.importLab(json);
      const devices = new Map<string, Device>();
      lab.devices.forEach(d => devices.set(d.id, d));
      set({ devices });
      get().addNotification('Lab imported successfully', 'INFO');
    } catch (e) {
      get().addNotification('Failed to import lab: invalid JSON', 'ERROR');
    }
  },
  
  // Lab templates
  loadLabTemplate: (templateId) => {
    const template = labTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    const devices = new Map<string, Device>();
    const deviceNameMap = new Map<string, string>(); // name -> id
    
    // Create devices
    for (const dt of template.topology.devices) {
      let device: Device;
      if (dt.type === 'host') {
        device = DeviceFactory.createHost(dt.name, dt.portCount);
      } else if (dt.type === 'storage') {
        device = DeviceFactory.createStorage(dt.name, dt.portCount);
      } else {
        device = DeviceFactory.createDevice({
          name: dt.name,
          vendor: dt.vendor,
          type: dt.type,
          version: dt.version,
          domainId: dt.domainId,
          portCount: dt.portCount,
        });
      }
      devices.set(device.id, device);
      deviceNameMap.set(dt.name, device.id);
    }
    
    // Create fabric
    const fabricEngine = new FabricEngine();
    const fabric = fabricEngine.createFabric('PROD_FABRIC');
    
    // Add switches to fabric
    for (const dt of template.topology.devices) {
      if (dt.type === 'switch' || dt.type === 'director') {
        const deviceId = deviceNameMap.get(dt.name)!;
        fabricEngine.addSwitchToFabric(fabric.id, deviceId, dt.domainId);
        const device = devices.get(deviceId);
        if (device) device.fabricId = fabric.id;
      }
    }
    
    // Create links
    for (const link of template.topology.links) {
      const srcId = deviceNameMap.get(link.srcDevice)!;
      const dstId = deviceNameMap.get(link.dstDevice)!;
      const srcDevice = devices.get(srcId);
      const dstDevice = devices.get(dstId);
      
      if (srcDevice && dstDevice) {
        const srcPort = srcDevice.ports[link.srcPort];
        const dstPort = dstDevice.ports[link.dstPort];
        
        if (srcPort && dstPort) {
          srcPort.connectedTo = dstPort.id;
          dstPort.connectedTo = srcPort.id;
          srcPort.speed = link.speed;
          dstPort.speed = link.speed;
          
          if (link.type === 'ISL') {
            srcPort.type = 'E_Port';
            dstPort.type = 'E_Port';
            const isl: ISL = {
              id: uuidv4(),
              srcDeviceId: srcId,
              srcPort: srcPort.id,
              dstDeviceId: dstId,
              dstPort: dstPort.id,
              state: 'up',
              speed: link.speed,
              utilization: Math.floor(Math.random() * 30) + 10,
            };
            fabricEngine.addISL(fabric.id, isl);
          }
        }
      }
    }
    
    // Make first switch principal
    if (fabric.switches.length > 0) {
      const principalDevice = devices.get(fabric.switches[0]);
      if (principalDevice) principalDevice.principalSwitch = true;
    }
    
    // Perform FLOGI
    fabricEngine.performFLOGI(devices, fabric.id);
    
    set({ devices, fabrics: fabricEngine, selectedFabricId: fabric.id });
    get().addNotification(`Lab "${template.name}" loaded successfully`, 'INFO');
  },
  
  // Notifications
  addNotification: (message, severity) => {
    const notifications = [...get().notifications, { id: uuidv4(), message, severity, timestamp: Date.now() }];
    if (notifications.length > 50) notifications.shift();
    set({ notifications });
  },
  
  clearNotifications: () => set({ notifications: [] }),
}));
