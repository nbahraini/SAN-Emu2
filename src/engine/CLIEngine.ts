import type { Device, FCPort, ZoningConfig } from '../types';
import { ZoningEngine, WWNGenerator } from './SimulationEngine';

export interface CLIResult {
  output: string;
  prompt: string;
  mode: string;
}

// ============= Brocade FOS CLI Engine =============
export class BrocadeCLIEngine {
  private device: Device;
  private mode: 'admin' | 'config' = 'admin';
  private configBuffer: { zone?: string; alias?: string; config?: string } = {};

  constructor(device: Device) {
    this.device = device;
  }

  getPrompt(): string {
    return `${this.device.name}:admin> `;
  }

  execute(command: string): CLIResult {
    const trimmed = command.trim();
    if (!trimmed) return { output: '', prompt: this.getPrompt(), mode: this.mode };

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Check version-specific command availability
    if (!this.isCommandAvailable(cmd)) {
      return {
        output: `Invalid command for Fabric OS ${this.device.version}.\n${this.getPrompt()}`,
        prompt: this.getPrompt(),
        mode: this.mode,
      };
    }

    let output = '';
    switch (cmd) {
      case 'switchshow': output = this.switchshow(); break;
      case 'fabricshow': output = this.fabricshow(); break;
      case 'nsshow': output = this.nsshow(); break;
      case 'nsallshow': output = this.nsallshow(); break;
      case 'portshow': output = this.portshow(args[0]); break;
      case 'portstatsshow': output = this.portstatsshow(args[0]); break;
      case 'porterrshow': output = this.porterrshow(); break;
      case 'cfgshow': output = this.cfgshow(); break;
      case 'zoneshow': output = this.zoneshow(args[0]); break;
      case 'cfgactvshow': output = this.cfgactvshow(); break;
      case 'licenseshow': output = this.licenseshow(); break;
      case 'version': output = this.version(); break;
      case 'firmwareshow': output = this.firmwareshow(); break;
      case 'supportshow': output = this.supportshow(); break;
      case 'errdump': output = this.errdump(); break;
      case 'logdump': output = this.logdump(); break;
      case 'switchstatusshow': output = this.switchstatusshow(); break;
      case 'islshow': output = this.islshow(); break;
      case 'trunkshow': output = this.trunkshow(); break;
      case 'chassisshow': output = this.chassisshow(); break;
      case 'slotshow': output = this.slotshow(); break;
      case 'nscamshow': output = this.nscamshow(); break;
      // Configuration commands
      case 'alicreate': output = this.alicreate(args); break;
      case 'zonecreate': output = this.zonecreate(args); break;
      case 'zoneadd': output = this.zoneadd(args); break;
      case 'cfgcreate': output = this.cfgcreate(args); break;
      case 'cfgadd': output = this.cfgadd(args); break;
      case 'cfgenable': output = this.cfgenable(args); break;
      case 'cfgdisable': output = this.cfgdisable(); break;
      case 'cfgsave': output = this.cfgsave(); break;
      case 'portdisable': output = this.portdisable(args[0]); break;
      case 'portenable': output = this.portenable(args[0]); break;
      case 'switchdisable': output = this.switchdisable(); break;
      case 'switchenable': output = this.switchenable(); break;
      case 'portcfgspeed': output = this.portcfgspeed(args); break;
      case 'portcfgshow': output = this.portcfgshow(args[0]); break;
      case 'help': output = this.help(); break;
      case 'clear': output = ''; break;
      default:
        output = `Unknown command: ${cmd}. Type 'help' for available commands.`;
    }

    return { output: output + '\n' + this.getPrompt(), prompt: this.getPrompt(), mode: this.mode };
  }

  private isCommandAvailable(cmd: string): boolean {
    const gen7Only = ['portcfgspeed'];
    const gen8Plus = ['nscamshow'];
    const gen9Plus = ['ismshow'];
    
    if (this.device.version.startsWith('7') && (gen8Plus.includes(cmd) || gen9Plus.includes(cmd))) return false;
    if (this.device.version.startsWith('8') && gen9Plus.includes(cmd)) return false;
    return true;
  }

  private switchshow(): string {
    const lines: string[] = [];
    lines.push(`switchName:     ${this.device.name}`);
    lines.push(`switchType:     ${this.device.type === 'director' ? '72.4' : '162.0'}`);
    lines.push(`switchState:    ${this.device.enabled ? 'Online' : 'Offline'}`);
    lines.push(`switchMode:     Native`);
    lines.push(`switchRole:     ${this.device.principalSwitch ? 'Principal' : 'Subordinate'}`);
    lines.push(`switchDomain:   ${this.device.domainId}`);
    lines.push(`switchIpAddr:   ${this.device.ipAddress}`);
    lines.push(`switchWwn:      ${this.device.mgmtWwpn}`);
    lines.push(`switchEnabled:  ${this.device.enabled ? 'Yes' : 'No'}`);
    lines.push(`Zoning:         ${this.device.config.zoning.activeConfig ? 'ON' : 'OFF'}`);
    lines.push('');
    lines.push(`${this.device.name}:admin> Index Port Address Media Speed State Proto`);
    lines.push('=====================================================');
    
    for (const port of this.device.ports) {
      const addr = port.fcid || `${this.device.domainId.toString(16).padStart(2,'0')}${(port.index+1).toString(16).padStart(2,'0')}00`;
      const state = port.state === 'online' ? (port.connectedTo ? 'Online' : 'No_Module') : 
                    port.state === 'disabled' ? 'No_Light' : 
                    port.state === 'faulty' ? 'Faulty' : 'Offline';
      const speed = port.speed >= 32 ? '32G' : port.speed >= 16 ? '16G' : '8G';
      lines.push(`${port.index.toString().padEnd(6)}${port.name.padEnd(5)}${addr.padEnd(9)}${port.media.padEnd(4)}${speed.padEnd(6)}${state.padEnd(10)}${port.type === 'E_Port' ? 'E ' : port.type === 'F_Port' ? 'F ' : 'N '}`);
    }
    return lines.join('\n');
  }

  private fabricshow(): string {
    const lines: string[] = [];
    lines.push('Fabric Name:  PROD_FABRIC');
    lines.push(`Fabric SID:   ${this.device.domainId}`);
    lines.push('');
    lines.push('Area Port Id  Switch Name          Cap  Domain Type IP Address');
    lines.push('--------------------------------------------------------------');
    lines.push(`${(this.device.domainId).toString(16).padStart(2,'0')}   00    ${this.device.name.padEnd(20)} ${this.device.type === 'director' ? '162' : '162'}   ${this.device.domainId.toString().padEnd(7)}${this.device.principalSwitch ? 'Principal' : 'Subordinate'}  ${this.device.ipAddress}`);
    return lines.join('\n');
  }

  private nsshow(): string {
    const lines: string[] = [];
    lines.push('Type Pid FCID    Enet Sss Ppp User Port Name     Node Name');
    lines.push('------------------------------------------------------------------');
    
    // Show connected devices
    for (const port of this.device.ports) {
      if (port.connectedTo && port.state === 'online') {
        const fcid = `${this.device.domainId.toString(16).padStart(2,'0')}${(port.index+1).toString(16).padStart(2,'0')}01`;
        lines.push(`0x1  ${port.index.toString().padEnd(4)}${fcid}   000000  00  000  000  ${port.wwpn || 'N/A'}  ${port.wwnn || 'N/A'}`);
      }
    }
    
    if (lines.length === 2) {
      lines.push('(No devices logged in)');
    }
    return lines.join('\n');
  }

  private nsallshow(): string {
    return this.nsshow() + '\n\n(All fabrics shown)';
  }

  private nscamshow(): string {
    const lines: string[] = [];
    lines.push('FCID          Type Port Name                    Node Name');
    lines.push('-----------------------------------------------------------');
    for (const port of this.device.ports) {
      if (port.connectedTo && port.state === 'online') {
        const fcid = `${this.device.domainId.toString(16).padStart(2,'0')}${(port.index+1).toString(16).padStart(2,'0')}01`;
        lines.push(`${fcid}   N    ${port.wwpn || 'N/A'}  ${port.wwnn || 'N/A'}`);
      }
    }
    return lines.join('\n');
  }

  private portshow(portIdx?: string): string {
    if (portIdx !== undefined) {
      const port = this.device.ports.find(p => p.index === parseInt(portIdx) || p.name === portIdx);
      if (!port) return `Port ${portIdx} not found.`;
      const lines: string[] = [];
      lines.push(`portName:    ${port.name}`);
      lines.push(`portHealth:  ${port.state === 'online' ? 'HEALTHY' : port.state === 'faulty' ? 'FAULTY' : 'NO_LIGHT'}`);
      lines.push(`portSpeed:   ${port.speed}G`);
      lines.push(`portType:    ${port.type}`);
      lines.push(`portState:   ${port.state === 'online' ? 'Online' : port.state === 'disabled' ? 'Disabled' : 'Offline'}`);
      lines.push(`portPhys:    ${port.state === 'online' ? 'Online' : 'Offline'}`);
      lines.push(`portScn:     0`);
      lines.push(`portWwn:     ${port.wwpn || 'N/A'}`);
      lines.push(`portNodeWwn: ${port.wwnn || 'N/A'}`);
      lines.push(`Media Type:  Fiber Channel Long Wave Laser`);
      lines.push(`NPIV:        ${port.npivEnabled ? 'Enabled' : 'Disabled'}`);
      lines.push(`Virtual Port: ${port.virtualPorts.length}`);
      return lines.join('\n');
    }
    return this.switchshow();
  }

  private portstatsshow(portIdx?: string): string {
    const lines: string[] = [];
    lines.push('           frames    tx      rx     enc_in  crc_err  disc_c3');
    lines.push('--------------------------------------------------------------');
    if (portIdx !== undefined) {
      const port = this.device.ports.find(p => p.index === parseInt(portIdx) || p.name === portIdx);
      if (!port) return `Port ${portIdx} not found.`;
      lines.push(`${port.name.padEnd(12)} ${Math.floor(Math.random()*1000000).toString().padEnd(10)} ${Math.floor(Math.random()*500000).toString().padEnd(8)} ${port.errors.encIn.toString().padEnd(8)} ${port.errors.crcErr.toString().padEnd(9)} ${port.errors.discC3.toString().padEnd(8)}`);
    } else {
      for (const port of this.device.ports) {
        lines.push(`${port.name.padEnd(12)} ${Math.floor(Math.random()*1000000).toString().padEnd(10)} ${Math.floor(Math.random()*500000).toString().padEnd(8)} ${port.errors.encIn.toString().padEnd(8)} ${port.errors.crcErr.toString().padEnd(9)} ${port.errors.discC3.toString().padEnd(8)}`);
      }
    }
    return lines.join('\n');
  }

  private porterrshow(): string {
    const lines: string[] = [];
    lines.push('           enc_in  crc_err  too_short  too_long  bad_eof  disc_c3');
    lines.push('------------------------------------------------------------------');
    for (const port of this.device.ports) {
      lines.push(`${port.name.padEnd(12)} ${port.errors.encIn.toString().padEnd(8)} ${port.errors.crcErr.toString().padEnd(9)} ${port.errors.tooShort.toString().padEnd(11)} ${port.errors.tooLong.toString().padEnd(10)} ${port.errors.badEof.toString().padEnd(9)} ${port.errors.discC3.toString().padEnd(8)}`);
    }
    return lines.join('\n');
  }

  private cfgshow(): string {
    const zoning = this.device.config.zoning;
    const lines: string[] = [];
    
    lines.push('Defined configuration:');
    lines.push('------------------------------------------------------------------');
    
    if (zoning.aliases.length > 0) {
      lines.push('Alias name:');
      for (const alias of zoning.aliases) {
        lines.push(`  ${alias.name}`);
        lines.push(`    ${alias.members.join('; ')}`);
      }
    }
    
    if (zoning.zones.length > 0) {
      lines.push('\nZone name:');
      for (const zone of zoning.zones) {
        lines.push(`  ${zone.name}`);
        lines.push(`    ${zone.members.join('; ')}`);
      }
    }
    
    if (zoning.configs.length > 0) {
      lines.push('\nCfg name:');
      for (const cfg of zoning.configs) {
        lines.push(`  ${cfg.name}`);
        lines.push(`    ${cfg.zones.join('; ')}`);
      }
    }
    
    if (zoning.aliases.length === 0 && zoning.zones.length === 0) {
      lines.push('  (No zoning configuration defined)');
    }
    
    return lines.join('\n');
  }

  private zoneshow(zoneName?: string): string {
    if (!zoneName) return 'Usage: zoneshow <zoneName>';
    const zone = this.device.config.zoning.zones.find(z => z.name === zoneName);
    if (!zone) return `Zone ${zoneName} not found.`;
    const lines: string[] = [];
    lines.push(`Zone name: ${zone.name}`);
    for (const member of zone.members) {
      const alias = this.device.config.zoning.aliases.find(a => a.name === member);
      if (alias) {
        lines.push(`  ${alias.name}: ${alias.members.join('; ')}`);
      } else {
        lines.push(`  ${member}`);
      }
    }
    return lines.join('\n');
  }

  private cfgactvshow(): string {
    const zoning = this.device.config.zoning;
    if (!zoning.activeConfig) return 'No configuration is currently active.\n\nEffective configuration:\n  (none)';
    const cfg = zoning.configs.find(c => c.name === zoning.activeConfig);
    if (!cfg) return 'Active configuration not found.';
    const lines: string[] = [];
    lines.push(`Active configuration: ${cfg.name}`);
    for (const zoneName of cfg.zones) {
      const zone = zoning.zones.find(z => z.name === zoneName);
      if (zone) {
        lines.push(`  ${zoneName}:`);
        for (const member of zone.members) {
          const alias = zoning.aliases.find(a => a.name === member);
          if (alias) {
            lines.push(`    ${alias.name}: ${alias.members.join('; ')}`);
          } else {
            lines.push(`    ${member}`);
          }
        }
      }
    }
    return lines.join('\n');
  }

  private licenseshow(): string {
    const features = this.device.version.startsWith('9') ? 
      ['Fabric OS', 'Fabric Watch', 'ISL Trunking', 'Extended Fabrics', 'Virtual Fabrics', 'FC Routing', 'Integrated Routing', 'NPIV', 'Enhanced Grouping', 'QoS', 'FC-IP', 'Full Fabric'] :
      this.device.version.startsWith('8') ?
      ['Fabric OS', 'Fabric Watch', 'ISL Trunking', 'Extended Fabrics', 'Virtual Fabrics', 'FC Routing', 'NPIV', 'Enhanced Grouping', 'QoS', 'Full Fabric'] :
      ['Fabric OS', 'Fabric Watch', 'ISL Trunking', 'Extended Fabrics', 'Virtual Fabrics', 'NPIV', 'QoS', 'Full Fabric'];
    
    const lines: string[] = [];
    lines.push(`License information for ${this.device.name}:`);
    for (const f of features) {
      lines.push(`  ${f.padEnd(30)} [Licensed]`);
    }
    return lines.join('\n');
  }

  private version(): string {
    return `Fabric OS:  v${this.device.version}\nMade on:    ${new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]}\nFlash:      Fri Jan 15 10:00:00 2024\nBootProm:   1.0.21`;
  }

  private firmwareshow(): string {
    return `Auto:    Primary\nPrimary:   v${this.device.version}\nSecondary: v${this.device.version}`;
  }

  private supportshow(): string {
    const lines: string[] = [];
    lines.push('## switchshow');
    lines.push(`switchName:     ${this.device.name}`);
    lines.push(`switchType:     162.0`);
    lines.push(`switchState:    ${this.device.enabled ? 'Online' : 'Offline'}`);
    lines.push(`switchDomain:   ${this.device.domainId}`);
    lines.push(`switchIpAddr:   ${this.device.ipAddress}`);
    lines.push('');
    lines.push('## firmwareshow');
    lines.push(`Fabric OS: v${this.device.version}`);
    lines.push('');
    lines.push('## licenseshow');
    lines.push('All licenses active');
    return lines.join('\n');
  }

  private errdump(): string {
    if (this.device.logs.length === 0) return 'No errors recorded.';
    const lines: string[] = [];
    const errors = this.device.logs.filter(l => l.severity === 'ERROR' || l.severity === 'CRITICAL');
    for (const log of errors.slice(-20)) {
      lines.push(`[${new Date(log.timestamp).toISOString()}] ${log.severity}: ${log.source}: ${log.message}`);
    }
    return lines.join('\n') || 'No errors recorded.';
  }

  private logdump(): string {
    const lines: string[] = [];
    for (const log of this.device.logs.slice(-30)) {
      lines.push(`[${new Date(log.timestamp).toISOString()}] ${log.severity}: ${log.source}: ${log.message}`);
    }
    return lines.join('\n') || 'No log entries.';
  }

  private switchstatusshow(): string {
    const lines: string[] = [];
    lines.push(`Switch Health Report:`);
    lines.push(`  Switch:        ${this.device.enabled ? 'HEALTHY' : 'DOWN'}`);
    lines.push(`  Power:         OK`);
    lines.push(`  Fans:          OK`);
    lines.push(`  Temperature:   OK`);
    lines.push(`  Marginal:      ${this.device.ports.filter(p => p.state === 'faulty').length > 0 ? 'YES' : 'NO'}`);
    lines.push(`  Monitored:     ${this.device.ports.length} ports`);
    lines.push(`  Down:          ${this.device.ports.filter(p => p.state === 'offline' || p.state === 'disabled').length} ports`);
    return lines.join('\n');
  }

  private islshow(): string {
    const lines: string[] = [];
    const ePorts = this.device.ports.filter(p => p.type === 'E_Port');
    if (ePorts.length === 0) return 'No ISLs configured.';
    lines.push('ISL port  State  Speed  Remote Switch  Remote Port');
    lines.push('---------------------------------------------------');
    for (const port of ePorts) {
      const state = port.state === 'online' ? 'Online' : 'Offline';
      lines.push(`${port.name.padEnd(8)} ${state.padEnd(7)} ${port.speed}G   N/A            N/A`);
    }
    return lines.join('\n');
  }

  private trunkshow(): string {
    if (!this.device.config.trunking) return 'Trunking is not enabled.';
    return 'No trunk groups configured.';
  }

  private chassisshow(): string {
    const lines: string[] = [];
    lines.push(`Chassis Serial Number: ${this.device.serialNumber}`);
    lines.push(`Chassis Type: ${this.device.type === 'director' ? 'DCX 8510' : 'G620'}`);
    lines.push(`Chassis WWN: ${this.device.mgmtWwpn}`);
    return lines.join('\n');
  }

  private slotshow(): string {
    const lines: string[] = [];
    lines.push('Slot  Type          State');
    lines.push('-------------------------');
    lines.push(`0     Control Route OK`);
    lines.push(`1     Core Blade    OK`);
    if (this.device.type === 'director') {
      lines.push(`2     Core Blade    OK`);
      for (let i = 3; i <= 6; i++) {
        lines.push(`${i}     FC Blade      OK`);
      }
    }
    return lines.join('\n');
  }

  // Configuration commands
  private alicreate(args: string[]): string {
    if (args.length < 2) return 'Usage: alicreate <aliasName>, "<memberWwpn>"';
    const name = args[0].replace(',', '');
    const members = args.slice(1).join(' ').replace(/"/g, '').split(';').map(m => m.trim()).filter(m => m);
    ZoningEngine.createAlias(this.device.config.zoning, name, members);
    this.addLog('INFO', 'CLI', `Alias created: ${name} with members: ${members.join(', ')}`);
    return `Alias "${name}" created with ${members.length} member(s).`;
  }

  private zonecreate(args: string[]): string {
    if (args.length < 2) return 'Usage: zonecreate <zoneName>, "<member1>; <member2>"';
    const name = args[0].replace(',', '');
    const members = args.slice(1).join(' ').replace(/"/g, '').split(';').map(m => m.trim()).filter(m => m);
    ZoningEngine.createZone(this.device.config.zoning, name, members);
    this.addLog('INFO', 'CLI', `Zone created: ${name} with members: ${members.join(', ')}`);
    return `Zone "${name}" created with ${members.length} member(s).`;
  }

  private zoneadd(args: string[]): string {
    if (args.length < 2) return 'Usage: zoneadd <zoneName>, "<member>"';
    const name = args[0].replace(',', '');
    const members = args.slice(1).join(' ').replace(/"/g, '').split(';').map(m => m.trim()).filter(m => m);
    const success = ZoningEngine.addToZone(this.device.config.zoning, name, members);
    if (!success) return `Zone "${name}" not found.`;
    return `Zone "${name}" updated.`;
  }

  private cfgcreate(args: string[]): string {
    if (args.length < 2) return 'Usage: cfgcreate <cfgName>, "<zone1>; <zone2>"';
    const name = args[0].replace(',', '');
    const zones = args.slice(1).join(' ').replace(/"/g, '').split(';').map(m => m.trim()).filter(m => m);
    ZoningEngine.createConfig(this.device.config.zoning, name, zones);
    this.addLog('INFO', 'CLI', `Config created: ${name}`);
    return `Configuration "${name}" created.`;
  }

  private cfgadd(args: string[]): string {
    if (args.length < 2) return 'Usage: cfgadd <cfgName>, "<zoneName>"';
    const name = args[0].replace(',', '');
    const zones = args.slice(1).join(' ').replace(/"/g, '').split(';').map(m => m.trim()).filter(m => m);
    const cfg = this.device.config.zoning.configs.find(c => c.name === name);
    if (!cfg) return `Configuration "${name}" not found.`;
    cfg.zones.push(...zones);
    return `Configuration "${name}" updated.`;
  }

  private cfgenable(args: string[]): string {
    if (args.length < 1) return 'Usage: cfgenable <cfgName>';
    const name = args[0];
    const success = ZoningEngine.activateConfig(this.device.config.zoning, name);
    if (!success) return `Configuration "${name}" not found.`;
    this.addLog('INFO', 'CLI', `Configuration enabled: ${name}`);
    return `Configuration "${name}" is now active.`;
  }

  private cfgdisable(): string {
    ZoningEngine.deactivateConfig(this.device.config.zoning);
    this.addLog('INFO', 'CLI', 'Configuration disabled');
    return 'Configuration deactivated.';
  }

  private cfgsave(): string {
    ZoningEngine.saveConfig(this.device.config.zoning);
    this.addLog('INFO', 'CLI', 'Configuration saved');
    return 'Configuration saved to non-volatile memory.';
  }

  private portdisable(portIdx: string): string {
    if (!portIdx) return 'Usage: portdisable <portIndex>';
    const port = this.device.ports.find(p => p.index === parseInt(portIdx) || p.name === portIdx);
    if (!port) return `Port ${portIdx} not found.`;
    port.state = 'disabled';
    this.addLog('WARNING', 'CLI', `Port ${port.name} disabled`);
    return `Port ${port.name} disabled.`;
  }

  private portenable(portIdx: string): string {
    if (!portIdx) return 'Usage: portenable <portIndex>';
    const port = this.device.ports.find(p => p.index === parseInt(portIdx) || p.name === portIdx);
    if (!port) return `Port ${portIdx} not found.`;
    port.state = 'online';
    this.addLog('INFO', 'CLI', `Port ${port.name} enabled`);
    return `Port ${port.name} enabled.`;
  }

  private switchdisable(): string {
    this.device.enabled = false;
    this.device.ports.forEach(p => p.state = 'offline');
    this.addLog('CRITICAL', 'CLI', 'Switch disabled');
    return 'Switch disabled. All ports offline.';
  }

  private switchenable(): string {
    this.device.enabled = true;
    this.device.ports.forEach(p => { if (p.state === 'offline') p.state = 'online'; });
    this.addLog('INFO', 'CLI', 'Switch enabled');
    return 'Switch enabled. Ports restored.';
  }

  private portcfgspeed(args: string[]): string {
    if (args.length < 2) return 'Usage: portcfgspeed <portIndex> <speed>';
    const port = this.device.ports.find(p => p.index === parseInt(args[0]) || p.name === args[0]);
    if (!port) return `Port ${args[0]} not found.`;
    const speed = parseInt(args[1]);
    if (![2, 4, 8, 16, 32].includes(speed)) return 'Invalid speed. Use 2, 4, 8, 16, or 32.';
    port.speed = speed;
    return `Port ${port.name} speed set to ${speed}G.`;
  }

  private portcfgshow(portIdx?: string): string {
    if (!portIdx) return 'Usage: portcfgshow <portIndex>';
    const port = this.device.ports.find(p => p.index === parseInt(portIdx) || p.name === portIdx);
    if (!port) return `Port ${portIdx} not found.`;
    const lines: string[] = [];
    lines.push(`Port ${port.name}:`);
    lines.push(`  Speed: ${port.speed}G`);
    lines.push(`  Type: ${port.type}`);
    lines.push(`  NPIV: ${port.npivEnabled ? 'Enabled' : 'Disabled'}`);
    lines.push(`  Trunk: ${this.device.config.trunking ? 'Enabled' : 'Disabled'}`);
    return lines.join('\n');
  }

  private help(): string {
    return `Available commands:
  switchshow          - Display switch information
  fabricshow          - Display fabric information
  nsshow              - Display name server (local fabric)
  nsallshow           - Display name server (all fabrics)
  nscamshow           - Display name server CAM table
  portshow [port]     - Display port information
  portstatsshow [port]- Display port statistics
  porterrshow         - Display port errors
  cfgshow             - Display zoning configuration
  zoneshow <zone>     - Display zone details
  cfgactvshow         - Display active configuration
  cfgcreate <name>, "<zones>" - Create configuration
  cfgadd <name>, "<zone>"     - Add zone to configuration
  cfgenable <name>    - Enable configuration
  cfgdisable          - Disable active configuration
  cfgsave             - Save configuration
  alicreate <name>, "<wwpn>"  - Create alias
  zonecreate <name>, "<members>" - Create zone
  zoneadd <name>, "<member>"  - Add to zone
  portdisable <port>  - Disable port
  portenable <port>   - Enable port
  portcfgspeed <port> <speed> - Set port speed
  portcfgshow <port>  - Show port configuration
  switchdisable       - Disable switch
  switchenable        - Enable switch
  licenseshow         - Display license information
  version             - Display FOS version
  firmwareshow        - Display firmware information
  supportshow         - Display support information
  errdump             - Display error log
  logdump             - Display system log
  switchstatusshow    - Display switch health
  islshow             - Display ISL information
  trunkshow           - Display trunk information
  chassisshow         - Display chassis information
  slotshow            - Display slot information
  help                - Display this help`;
  }

  private addLog(severity: string, source: string, message: string): void {
    this.device.logs.push({
      timestamp: Date.now(),
      severity: severity as any,
      source,
      message,
    });
  }
}

// ============= Cisco MDS CLI Engine =============
export class CiscoCLIEngine {
  private device: Device;
  private mode: 'exec' | 'config' | 'config-if' | 'config-zone' | 'config-vsan' = 'exec';
  private currentInterface: string = '';
  private configBuffer: string = '';

  constructor(device: Device) {
    this.device = device;
  }

  getPrompt(): string {
    switch (this.mode) {
      case 'exec': return `${this.device.name}# `;
      case 'config': return `${this.device.name}(config)# `;
      case 'config-if': return `${this.device.name}(config-if)# `;
      case 'config-zone': return `${this.device.name}(config-zone)# `;
      case 'config-vsan': return `${this.device.name}(config-vsan)# `;
      default: return `${this.device.name}# `;
    }
  }

  execute(command: string): CLIResult {
    const trimmed = command.trim();
    if (!trimmed) return { output: '', prompt: this.getPrompt(), mode: this.mode };

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    let output = '';
    
    if (cmd === 'exit' || cmd === 'end') {
      return this.handleExit();
    }

    switch (this.mode) {
      case 'exec':
        output = this.execMode(cmd, args, trimmed);
        break;
      case 'config':
        output = this.configMode(cmd, args, trimmed);
        break;
      case 'config-if':
        output = this.configIfMode(cmd, args, trimmed);
        break;
      case 'config-zone':
        output = this.configZoneMode(cmd, args, trimmed);
        break;
      case 'config-vsan':
        output = this.configVsanMode(cmd, args, trimmed);
        break;
    }

    return { output: output + '\n' + this.getPrompt(), prompt: this.getPrompt(), mode: this.mode };
  }

  private handleExit(): CLIResult {
    switch (this.mode) {
      case 'config-if':
      case 'config-zone':
      case 'config-vsan':
        this.mode = 'config';
        break;
      case 'config':
        this.mode = 'exec';
        break;
      default:
        break;
    }
    return { output: '', prompt: this.getPrompt(), mode: this.mode };
  }

  private execMode(cmd: string, args: string[], fullCmd: string): string {
    if (cmd === 'configure' && args[0] === 'terminal') {
      this.mode = 'config';
      return '';
    }

    if (cmd === 'show') {
      return this.handleShow(args, fullCmd);
    }

    if (cmd === 'copy' && args[0] === 'running-config' && args[1] === 'startup-config') {
      return 'Copy complete.';
    }

    if (cmd === 'write' && args[0] === 'memory') {
      return 'Copy complete.';
    }

    return `% Invalid command: "${fullCmd}"`;
  }

  private handleShow(args: string[], fullCmd: string): string {
    const subCmd = args[0]?.toLowerCase();
    
    switch (subCmd) {
      case 'version': return this.showVersion();
      case 'interface': return this.showInterface(args.slice(1));
      case 'flogi': return this.showFlogi(args.slice(1));
      case 'fcns': return this.showFcns(args.slice(1));
      case 'zoneset': return this.showZoneset(args.slice(1));
      case 'zone': return this.showZone(args.slice(1));
      case 'vsan': return this.showVsan(args.slice(1));
      case 'topology': return this.showTopology();
      case 'running-config': return this.showRunningConfig();
      case 'startup-config': return this.showStartupConfig();
      case 'port-channel': return this.showPortChannel(args.slice(1));
      case 'device-alias': return this.showDeviceAlias(args.slice(1));
      case 'logging': return this.showLogging();
      default: return `% Invalid show command: "${fullCmd}"`;
    }
  }

  private showVersion(): string {
    return `Cisco Storage Area Networking Operating System (NX-OS) Software
TAC support: http://www.cisco.com/tac
Copyright (c) 2002-2024, Cisco Systems, Inc. All rights reserved.
The copyrights to certain works contained in this software are
owned by other third parties and used and distributed under
license. Certain components of this software are licensed under
the GNU General Public License (GPL) version 2.0 or the GNU
Lesser General Public License (LGPL) Version 2.1.

Software
  BIOS:      version 4.0.1
  loader:    version 2.0.1
  kickstart: version ${this.device.version}
  system:    version ${this.device.version}
  BIOS compile time:       01/15/2024
  
Hardware
  cisco MDS 9148S (1 Slot) Chassis 
  Intel(R) Core(TM) i3 CPU @ 2.0GHz with 8192 kB of memory.
  Processor Board ID ${this.device.serialNumber}
  
  Device name: ${this.device.name}
  bootflash:   2097152 kB
  
Kernel uptime is ${Math.floor(this.device.uptime / 3600)} day(s), ${Math.floor((this.device.uptime % 3600) / 60)} hour(s), ${this.device.uptime % 60} minute(s)`;
  }

  private showInterface(args: string[]): string {
    if (args[0] === 'brief') {
      const lines: string[] = [];
      lines.push('Interface    VSAN  Admin    Admin   Status   SFP       Port');
      lines.push('                        Mode     Trunk   Status   Present   Channel');
      lines.push('------------------------------------------------------------------');
      for (const port of this.device.ports) {
        const status = port.state === 'online' ? 'up' : 'down';
        const adminMode = port.type === 'E_Port' ? 'E' : 'F';
        lines.push(`${port.name.padEnd(13)}${(this.device.vsanId || 1).toString().padEnd(6)}${adminMode.padEnd(9)}${(port.type === 'E_Port' ? 'yes' : 'no').padEnd(8)}${status.padEnd(9)}{'present'.padEnd(10)}${port.index.toString()}`);
      }
      return lines.join('\n');
    }
    
    if (args.length > 0) {
      const portName = args[0];
      const port = this.device.ports.find(p => p.name === portName);
      if (!port) return `% Interface ${portName} not found`;
      
      const lines: string[] = [];
      lines.push(`${port.name} is ${port.state === 'online' ? 'up' : 'down'} (Administratively ${port.state === 'disabled' ? 'down' : 'up'})`);
      lines.push(`  Port WWN is ${port.wwpn || 'N/A'}`);
      lines.push(`  Node WWN is ${port.wwnn || 'N/A'}`);
      lines.push(`  Port type is ${port.type}`);
      lines.push(`  Port VSAN is ${this.device.vsanId || 1}`);
      lines.push(`  Speed is ${port.speed} Gbps`);
      lines.push(`  Bit Tx Rate is ${port.speed * 1000} MBps`);
      lines.push(`  SFP is present`);
      lines.push(`  5 minute input rate ${Math.floor(Math.random() * 1000)} bytes/sec`);
      lines.push(`  5 minute output rate ${Math.floor(Math.random() * 800)} bytes/sec`);
      lines.push(`    ${Math.floor(Math.random() * 1000000)} frames input`);
      lines.push(`    ${Math.floor(Math.random() * 800000)} frames output`);
      lines.push(`    ${port.errors.crcErr} CRC errors`);
      return lines.join('\n');
    }
    
    return this.showInterface(['brief']);
  }

  private showFlogi(args: string[]): string {
    if (args[0] === 'database') {
      const lines: string[] = [];
      lines.push('------------------------------------------------------------------');
      lines.push('INTERFACE      VSAN    FCID            PORT NAME          NODE NAME');
      lines.push('------------------------------------------------------------------');
      for (const port of this.device.ports) {
        if (port.connectedTo && port.state === 'online') {
          const fcid = `0x${this.device.domainId.toString(16).padStart(2,'0')}${(port.index+1).toString(16).padStart(2,'0')}01`;
          lines.push(`${port.name.padEnd(15)}${(this.device.vsanId || 1).toString().padEnd(8)}${fcid.padEnd(16)}${port.wwpn || 'N/A'}  ${port.wwnn || 'N/A'}`);
        }
      }
      if (lines.length === 3) lines.push('No entries');
      return lines.join('\n');
    }
    return 'Usage: show flogi database';
  }

  private showFcns(args: string[]): string {
    if (args[0] === 'database') {
      const lines: string[] = [];
      lines.push('------------------------------------------------------------------');
      lines.push('VSAN    FCID            TYPE PORT NAME          NODE NAME');
      lines.push('------------------------------------------------------------------');
      for (const port of this.device.ports) {
        if (port.connectedTo && port.state === 'online') {
          const fcid = `0x${this.device.domainId.toString(16).padStart(2,'0')}${(port.index+1).toString(16).padStart(2,'0')}01`;
          lines.push(`${(this.device.vsanId || 1).toString().padEnd(8)}${fcid.padEnd(16)}N      ${port.wwpn || 'N/A'}  ${port.wwnn || 'N/A'}`);
        }
      }
      if (lines.length === 3) lines.push('No entries');
      return lines.join('\n');
    }
    return 'Usage: show fcns database';
  }

  private showZoneset(args: string[]): string {
    const zoning = this.device.config.zoning;
    if (args[0] === 'active') {
      if (!zoning.activeConfig) return 'No active zoneset.';
      const cfg = zoning.configs.find(c => c.active);
      if (!cfg) return 'No active zoneset.';
      const lines: string[] = [];
      lines.push(`zoneset name ${cfg.name} vsan ${this.device.vsanId || 1}`);
      for (const zoneName of cfg.zones) {
        const zone = zoning.zones.find(z => z.name === zoneName);
        if (zone) {
          lines.push(`  zone name ${zone.name} vsan ${this.device.vsanId || 1}`);
          for (const member of zone.members) {
            const alias = zoning.aliases.find(a => a.name === member);
            if (alias) {
              for (const m of alias.members) {
                lines.push(`    pwwn ${m}`);
              }
            } else {
              lines.push(`    pwwn ${member}`);
            }
          }
        }
      }
      return lines.join('\n');
    }
    
    const lines: string[] = [];
    for (const cfg of zoning.configs) {
      lines.push(`zoneset name ${cfg.name} vsan ${this.device.vsanId || 1}${cfg.active ? ' (active)' : ''}`);
    }
    if (lines.length === 0) lines.push('No zonesets configured.');
    return lines.join('\n');
  }

  private showZone(args: string[]): string {
    const zoning = this.device.config.zoning;
    if (args.length > 0) {
      const zone = zoning.zones.find(z => z.name === args[0]);
      if (!zone) return `Zone ${args[0]} not found.`;
      const lines: string[] = [];
      lines.push(`zone name ${zone.name} vsan ${this.device.vsanId || 1}`);
      for (const member of zone.members) {
        lines.push(`  ${member}`);
      }
      return lines.join('\n');
    }
    
    const lines: string[] = [];
    for (const zone of zoning.zones) {
      lines.push(`zone name ${zone.name} vsan ${this.device.vsanId || 1}`);
      for (const member of zone.members) {
        lines.push(`  ${member}`);
      }
    }
    if (lines.length === 0) lines.push('No zones configured.');
    return lines.join('\n');
  }

  private showVsan(args: string[]): string {
    const lines: string[] = [];
    lines.push('VSAN_ID  VSAN_STATE  VSAN_OPER_STATE');
    lines.push('--------------------------------------');
    lines.push(`${(this.device.vsanId || 1).toString().padEnd(9)}${'active'.padEnd(12)}up`);
    return lines.join('\n');
  }

  private showTopology(): string {
    const lines: string[] = [];
    lines.push('Port    Vsan  Domain  Pwwn                Node Name');
    lines.push('-----------------------------------------------------');
    lines.push(`${this.device.ports[0]?.name || 'N/A'}     ${this.device.vsanId || 1}     ${this.device.domainId.toString().padEnd(8)}${this.device.mgmtWwpn}  ${this.device.name}`);
    return lines.join('\n');
  }

  private showRunningConfig(): string {
    const lines: string[] = [];
    lines.push('version ${this.device.version}'.replace('${this.device.version}', this.device.version));
    lines.push(`hostname ${this.device.name}`);
    lines.push('');
    lines.push(`feature fcoe`);
    lines.push('');
    
    for (const port of this.device.ports) {
      lines.push(`interface ${port.name}`);
      lines.push(`  switchport mode ${port.type === 'E_Port' ? 'E' : 'F'}`);
      lines.push(`  switchport speed ${port.speed}`);
      lines.push(`  no shutdown`);
      lines.push('');
    }
    
    const zoning = this.device.config.zoning;
    for (const alias of zoning.aliases) {
      lines.push(`device-alias name ${alias.name} pwwn ${alias.members[0]}`);
    }
    
    for (const zone of zoning.zones) {
      lines.push(`zone name ${zone.name} vsan ${this.device.vsanId || 1}`);
      for (const member of zone.members) {
        lines.push(`  member pwwn ${member}`);
      }
    }
    
    if (zoning.activeConfig) {
      lines.push(`zoneset name ${zoning.activeConfig} vsan ${this.device.vsanId || 1}`);
      const cfg = zoning.configs.find(c => c.active);
      if (cfg) {
        for (const z of cfg.zones) {
          lines.push(`  member ${z}`);
        }
      }
      lines.push(`zoneset activate name ${zoning.activeConfig} vsan ${this.device.vsanId || 1}`);
    }
    
    return lines.join('\n');
  }

  private showStartupConfig(): string {
    return this.showRunningConfig();
  }

  private showPortChannel(args: string[]): string {
    if (args[0] === 'summary') {
      return 'No port-channels configured.';
    }
    return 'Usage: show port-channel summary';
  }

  private showDeviceAlias(args: string[]): string {
    const zoning = this.device.config.zoning;
    const lines: string[] = [];
    lines.push('------------------------------------------------------------------');
    lines.push('NAME              ALIAS_PWWN          BIND_STATE');
    lines.push('------------------------------------------------------------------');
    for (const alias of zoning.aliases) {
      lines.push(`${alias.name.padEnd(18)}${alias.members[0]?.padEnd(20) || 'N/A'}OK`);
    }
    if (lines.length === 3) lines.push('No device aliases configured.');
    return lines.join('\n');
  }

  private showLogging(): string {
    const lines: string[] = [];
    for (const log of this.device.logs.slice(-20)) {
      lines.push(`${new Date(log.timestamp).toISOString()} ${log.severity}: ${log.message}`);
    }
    return lines.join('\n') || 'No log entries.';
  }

  private configMode(cmd: string, args: string[], fullCmd: string): string {
    if (cmd === 'interface' && args.length > 0) {
      this.currentInterface = args[0];
      this.mode = 'config-if';
      return '';
    }
    
    if (cmd === 'vsan' && args[0] === 'database') {
      this.mode = 'config-vsan';
      return '';
    }
    
    if (cmd === 'zone') {
      this.mode = 'config-zone';
      this.configBuffer = fullCmd;
      return '';
    }
    
    if (cmd === 'hostname' && args.length > 0) {
      this.device.name = args[0];
      return '';
    }
    
    if (cmd === 'device-alias' && args[0] === 'name') {
      const name = args[1];
      const wwpn = args[3];
      if (name && wwpn) {
        ZoningEngine.createAlias(this.device.config.zoning, name, [wwpn]);
        return '';
      }
    }
    
    if (cmd === 'zoneset') {
      if (args[0] === 'activate' && args[1] === 'name') {
        const name = args[2];
        ZoningEngine.activateConfig(this.device.config.zoning, name);
        return '';
      }
    }
    
    if (cmd === 'no' && args[0] === 'shutdown') {
      return '';
    }
    
    return `% Invalid command: "${fullCmd}"`;
  }

  private configIfMode(cmd: string, args: string[], fullCmd: string): string {
    const port = this.device.ports.find(p => p.name === this.currentInterface);
    if (!port) return `% Interface ${this.currentInterface} not found`;
    
    if (cmd === 'switchport' && args[0] === 'mode') {
      const mode = args[1]?.toUpperCase();
      if (mode === 'F') port.type = 'F_Port';
      else if (mode === 'E') port.type = 'E_Port';
      else if (mode === 'NP') port.type = 'NP_Port';
      return '';
    }
    
    if (cmd === 'switchport' && args[0] === 'speed') {
      port.speed = parseInt(args[1]) || port.speed;
      return '';
    }
    
    if (cmd === 'no' && args[0] === 'shutdown') {
      port.state = 'online';
      return '';
    }
    
    if (cmd === 'shutdown') {
      port.state = 'disabled';
      return '';
    }
    
    return `% Invalid interface command: "${fullCmd}"`;
  }

  private configZoneMode(cmd: string, args: string[], fullCmd: string): string {
    if (cmd === 'member') {
      // Parse member command
      const type = args[0];
      const value = args[1];
      if (type === 'pwwn' && value) {
        // Add to current zone
        const zoneName = this.configBuffer.match(/zone name (\S+)/)?.[1];
        if (zoneName) {
          ZoningEngine.addToZone(this.device.config.zoning, zoneName, [value]);
        }
      }
      return '';
    }
    
    if (cmd === 'exit' || cmd === 'end') {
      this.mode = 'config';
      return '';
    }
    
    return '';
  }

  private configVsanMode(cmd: string, args: string[], fullCmd: string): string {
    if (cmd === 'vsan' && args[0]) {
      this.device.vsanId = parseInt(args[0]);
      return '';
    }
    return `% Invalid VSAN command: "${fullCmd}"`;
  }
}

// ============= CLI Session Manager =============
export class CLIEngine {
  private sessions: Map<string, BrocadeCLIEngine | CiscoCLIEngine> = new Map();

  createSession(device: Device): BrocadeCLIEngine | CiscoCLIEngine {
    if (this.sessions.has(device.id)) {
      return this.sessions.get(device.id)!;
    }
    
    let engine: BrocadeCLIEngine | CiscoCLIEngine;
    if (device.vendor === 'brocade') {
      engine = new BrocadeCLIEngine(device);
    } else {
      engine = new CiscoCLIEngine(device);
    }
    
    this.sessions.set(device.id, engine);
    return engine;
  }

  execute(deviceId: string, command: string): CLIResult {
    const engine = this.sessions.get(deviceId);
    if (!engine) {
      return { output: 'No active session. Please connect to a device first.\n', prompt: '> ', mode: 'none' };
    }
    return engine.execute(command);
  }

  getPrompt(deviceId: string): string {
    const engine = this.sessions.get(deviceId);
    if (!engine) return '> ';
    return engine.getPrompt();
  }
}
