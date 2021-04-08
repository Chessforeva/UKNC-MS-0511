/*

 Debug window in a div container
 Only Step-debugging available, developed to test the emulator
 
 */

DBG = function() {

var self = this;

this.active = false;		// flag dbg is activated

var fdraw = true;		// flag to redraw, there are changes

var O = null;

this.Processor = Ppu;	//	Which processor is set		

var mem_addr_s = 0;		// Debug memory address
var mem_Mode = -1;


//	Possibility to stop somewhere, see Board.js SystemFrame loops

this.breakpoints = function(Processor) {
	if(dbg.active) return true;
	var pc = Processor.getPC();
	if(Processor.isCpu) {	/* CPU */
	//	if( parseInt("...",8)==pc ) {
	//		dbg.show();
	//		return 1;
	//		}
		}
	else
		{	/* PPU */

		// http://www.emuverse.ru/wiki/%D0%A3%D0%9A%D0%9D%D0%A6_ROM_disasm
		//if( parseInt("100000",8)==pc ) return true;		/* Loader driver (starting) */
		//if( parseInt("104306",8)==pc ) {			/* event on keyboard key pressed (ROM code) */
			//trace.start();
			//  trace.end();
			//return true;		
		//	}
		}
	return false;
}

this.init = function( div_id ) {

	O = GE( div_id );
	if(O!=null)  {
		var s = '<table height="340"><tr><td width="250"><table><tr><td>' +
		'<input type="button" class="dbg0" id="dbg_swap" value="Cpu/Ppu" title="Swap processor" onclick="dbg.Swap()">' +
		'<input type="button" class="dbg0" id="dbg_run" value="Run F10,stop F9" title="Run continue" onclick="dbg.Run()"><br>' +
		'<input type="button" class="dbg0" id="dbg_step" value="Step F7" title="Step" onclick="dbg.Step()">' +
		'<input type="button" class="dbg0" id="dbg_over" value="StepOver F8" title="Over" onclick="dbg.StepOver()">' +
		'<div class="dbg0" style="display:inline;"> BP:</div>' +
		'<input type="text" id="dbg_AddrBP" class="dbg0" value="" size="7" onchange="dbg.setBreakPoint()">' +
		'</td></tr><tr><td><div id="dbg_asm" class="dbg0"></div></td></tr></table></td>' +
		'<td width="160"><div title="To save .uknc" onclick="download_uknc()" style="display:inline;cursor:pointer">' +
		'<font color="brown" SIZE="2"><b><u>Save for UKNCBTL</u></b></font></div><a id="DOWNLUKNC"></a>' +
		'<div id="dbg_regs" class="dbg0"></div></td>' +
		'<td width="60"><div id="dbg_stack" class="dbg0"></div></td>' + 
		'<td width="120"><div id="dbg_ports" class="dbg0"></div></td>' +
		'<td width="100"><input type="text" id="dbg_AddrMem" class="dbg0" value="160000" size="7" onchange="dbg.MemRdrw()"> ' +
		'<select id="dbg_memMd" class="dbg0" onchange="dbg.MemMode()">' +
		'<option value="' + ADDRTYPE.ROM + '">ROM</option>' +
		'<option value="' + ADDRTYPE.RAM12 + '">CPU</option>' +
		'<option value="' + ADDRTYPE.RAM_PPU + '">PPU</option>' +
		'<option value="' + ADDRTYPE.RAM0 + '">RAM0</option>' +
		'<option value="' + ADDRTYPE.RAM1 + '">RAM1</option>' +
		'<option value="' + ADDRTYPE.RAM2 + '">RAM2</option>' +
		'</select><br>' +
		'<div id="dbg_mem" class="dbg0"></div></td></tr></table>';
		
		O.innerHTML = s;
	}
}


this.show = function() {
	if(O!=null) {
		O.style.visibility = 'visible';
		fdraw = true;
		self.active = true;
		self.redraw();
		}
	}
	
this.close = function() {
	if(O!=null) {
		O.style.visibility = 'hidden';
		fdraw = true;
		self.active = false;
		}
	}

this.Swap = function() {
	self.Processor = ( self.Processor.isCpu ? Ppu : Cpu );
	fdraw = true;
}

this.Run = function() {
	self.close();
	self.checkdata();
	//trace.start();
}

this.Step = function() {
	Board.DebugTicks();
	fdraw = true;
}

this.StepOver = function() {
	var pc = self.Processor.getPC();
	var L = self.InstructionDisasm( self.Processor, pc );
	self.Processor.bp = ADDRESS( pc + (L<<1) );
	Cpu.Tick = 0;
	Ppu.Tick = 0;
	self.active = false;
	fdraw = true;
}

this.setBreakPoint = function() {
	var addr = parseInt( GE("dbg_AddrBP").value, 8 );
	addr = ADDRESS( addr & 0xFFFE );
	GE("dbg_AddrBP").value = OCT(addr,6);
	self.Processor.bp = addr;
}

	// returns length of instruction, prepares Instr, Arg in disasm
this.InstructionDisasm = function( Processor, Address ) {

	var Mem3 = [];
	for( var k=0;k<3;k++ ) {
		Mem3[k] = Processor.MC.GetWord( ADDRESS(Address+(k<<1)), true );
	}
	return disasm.DisassembleInstruction( Mem3, Address );
}

this.redraw = function() {
	if(self.active) {
	
	if(fdraw && GE("dbg_memMd")!=null ) {
	
	var Addr = self.Processor.getPC();
		
	var ok=0, at=0, a, L, w, s, d=[], T, addr, g;
	for(T=0;(!ok) && (T<2);T++) {
	
		addr = ADDRESS(Addr-80+T);
	
		for(a=0;a<100 && (!ok || a<at+12);a++) {
		
			L = self.InstructionDisasm( self.Processor, addr );
			var Instr = disasm.getInstr(), Arg = disasm.getArg();

			g = (addr == Addr);
			if(g) { ok=1; at=a; }
			s = '';
			if(g) s+= '<font color="blue"><b>';
			s+= OCT(addr) + ': ' + Instr + ' ' + Arg ;
			if(g) s+='</b></font>';
			s+='</br>';
			d[a] = s;
			addr = ADDRESS(addr+(L<<1));
			}
		}
	
	s = '<div style="overflow-y: scroll; height:220px; width:300px">';			
	if(at>0) {
		for(a=at-8; a<at+9; a++) {
			s+=d[a];
		}
	}
	GE("dbg_asm").innerHTML = s;
	
	s = self.Processor.name + '<br>';			
	for(a=0;a<8;a++) {
		w = self.Processor.getReg(a);
		s += (a==6 ? 'SP' : (a==7 ? 'PC' : 'R'+a)) + ' ' + OCT(w) + ' ' + HEX(w) + '<br>';
		}
	w = self.Processor.getCPC(a);	
	s += 'PC' + "'" + OCT(w) + ' ' + HEX(w) + '<br>';
	s += '----------' + '<font color="red">' + 'HP..TNZVC' + '<br>';
	s += 'PS ' + BIN( self.Processor.getPSW(a) ) + '<br>';
	s += '</font>';
	s += 'PS' + "'" + BIN( self.Processor.getCPSW(a) ) + '<br>';
	s += ( self.Processor.Halted() ? "HALT" : "USER" );
	if( self.Processor.Stopped ) s += " ,STOP";
	GE("dbg_regs").innerHTML = s;
	
	s = 'Stack:' + '<br>';
	
	Addr = self.Processor.getSP();	// SP
	addr = ADDRESS(Addr-14);
	for(a=0; a<14; a++) {
			w = self.Processor.MC.GetWord( ADDRESS(addr), true );
			g = (addr == Addr);
			if(g) s+= '<font color="green"><b>';
			s+= OCT(w);
			if(g) s+='</b></font>';
			s+='<br>';
			addr = ADDRESS(addr+2);
		}

	GE("dbg_stack").innerHTML = s;
	
	s = 'Ports:' + '<br>';
	if( self.Processor.isCpu ) {
		s += s_port( '176640:', Port.o176640 );
		s += s_port( '176642:', Port.o176642 );
		
	}
	else {
	
		s += s_port( '177010:', Port.o177010 );
		s += s_port( '177012:', Port.o177012 );
		s += s_port( '177014:', Port.o177014 );
		s += s_port( '177016:', Port.o177016 );
		s += s_port( '177020:', Port.o177020 );
		s += s_port( '177022:', Port.o177022 );
		s += s_port( '177024:', Port.o177024 );
		s += s_port( '177026:', Port.o177026 );
		s += s_port( '177054:', Port.o177054 );
		s += s_port( '177700:', Port.o177700 );
		//s += s_port( '177702:', Port.o177702 );
		s += s_port( '177716:', Port.o177716 );
		s += s_port( '177710:', Timer.flags );		// global
		s += s_port( '177712:', Timer.reload );
		s += s_port( '177714:', Timer.Tick );

	}
	GE("dbg_ports").innerHTML = s;
	
	if(mem_Mode==-1) self.MemMode(1);
	self.MemRdrw();
	scr.DRAW();
	fdraw = false;
	trace.end();

	}
	
	setTimeout('dbg.redraw()',399);
	}
}

function s_port(name, w) {
	return (name + ' ' + OCT(w) + '<br>');
}

this.MemMode = function(first) {

	if(first) {
		mem_Mode = ADDRTYPE.RAM12;
		}
	else {
		mem_Mode = parseInt(GE("dbg_memMd").value);
		self.MemRdrw();
	}
	GE("dbg_memMd").value = mem_Mode;

}

this.MemRdrw = function() {

	var s, addr, w=0, a, d=0;
	s = '<div style="overflow-y: scroll; height:220px; width:140px">';
	addr = parseInt( GE("dbg_AddrMem").value, 8 );
	for(a=0; a<1000;a+=d) {
		addr&=65535;
		d=2;
		switch(mem_Mode)
		{
		case ADDRTYPE.ROM:
			addr&=32767;
			w = Board.GetROMWord( addr );
			break;
		case ADDRTYPE.RAM12:
			w = Cpu.MC.GetWord00( addr, true );
			break;
		case ADDRTYPE.RAM_PPU:
			w = Ppu.MC.GetWord00( addr, true );
			break;
		case ADDRTYPE.RAM0:
			w = RAM[0][addr]; d=1;
			break;
		case ADDRTYPE.RAM1:
			var j = addr>>>1;
			w = RAM[1][addr]; d=1;
			break;
		case ADDRTYPE.RAM2:
			var j = addr>>>1;
			w = RAM[2][addr]; d=1;
			break;
		}
		
		var q = OCT(w);
		s+= OCT(addr) + ' ' + (d==1?q.substr(3):q) + ' <br>';
		addr = ADDRESS(addr+d);
	}
	s += '</div>';
	GE("dbg_mem").innerHTML = s;
}


this.checkdata = function()  {
	var k,K,z,f=0;
	for(k=0;k<8;k++) {
		K = Cpu.getReg(k);
		if(((K&0xFFFF)>>>0)!=K) {
			LOG("ckdata:..CPU_regs..."); f=1;
			}
		K = Ppu.getReg(k);
		if(((K&0xFFFF)>>>0)!=K) {
			LOG("ckdata:..PPU_regs..."); f=1;
			}
	}
		
	for(k=0;k<0x10000;k++) {
	 for(z=0;z<3;z++) {
		K = RAM[z][k];
		if(((K&255)>>>0)!=K) {
			LOG("ckdata:..RAMs..."); f=1;
		}
	 }
	}
	
	K = Cpu.getPSW();
	if(((K&0xFFFF)>>>0)!=K) { LOG("ckdata:..CPU_psw...");f=1; }

	K = Ppu.getPSW();
	if(((K&0xFFFF)>>>0)!=K) {LOG("ckdata:..PPU_psw...");f=1; }
	
	if(f) alert("checkdata errors, see console log!!!");
}

return this;
}

/*----------------------

 Trace functionality.
 This creates a large
 Log file - comparable
 with UKNCBTL c++ result.
 Can be used in development.
 Allow 
   trace.start();
 when running
  dbg.Run();
-----------------------*/
Trace = function() {

var self = this;

var Trace = false;		// 1-on, 0-off

var counter = 0;
var log = [];	// log as array

var filestr = "";		// this to be public log-file


this.start = function() {
	log = [];
	filestr = "";
	Trace = true;
	speed.setOptimize(0);		// to compare log with ukncbtl
}

this.end = function() {

	if(Trace) {		// only if started
		log.push("");
		download("instrlog.txt",log.join(CR) );
		log = [];
		Trace = false;
		}
}

// this makes log of most things to see what is going on inside
// instruction, regs, flags, ports, channels

this.instr = function( processor ) {

	if(Trace) {		// only if started

	var pc = processor.getPC();
	var L = dbg.InstructionDisasm( processor, pc );
	var Instr = disasm.getInstr(), Arg = disasm.getArg();
	log.push( "#" + (++counter) + ". " + processor.name + ': ' +
		OCT(pc) + ': ' + Instr + ' ' + Arg );
	var s = '';
	for(var i=0;i<8;i++) {
		s+='R' + i + '=' + processor.getReg(i).toString(8) + ',';
	}
	
	log.push( s.toString(8) );
	log.push( BIN(processor.getPSW()) )
	
	var f = processor.isCpu;
	s='';
	s += pstr(' 176640=', f, Port.o176640 );
	s += pstr(' 176642=', f, Port.o176642 );
	log.push(s); s = '';
	s += pstr(' 177010=',!f, Port.o177010 );
	s += pstr(' 177012=',!f, Port.o177012 );
	s += pstr(' 177014=',!f, Port.o177014 );
	s += pstr(' 177016=',!f, Port.o177016 );
	log.push(s); s = '';
	s += pstr(' 177020=',!f, Port.o177020 );
	s += pstr(' 177022=',!f, Port.o177022 );
	s += pstr(' 177024=',!f, Port.o177024 );
	s += pstr(' 177026=',!f, Port.o177026 );
	s += pstr(' 177054=',!f, Port.o177054 );
	log.push(s); s = '';
	s += pstr(' 177700=',!f, Port.o177700 );
	s += pstr(' 177702=',!f, 0 /*Port.o177702*/ );		// keyboard
	s += pstr(' 177716=',!f, Port.o177716 );
	log.push(s); s = '';
	s += pstr(' 177710=',1, Timer.flags );
	s += pstr(' 177712=',1, Timer.reload );
	s += pstr(' 177714=',1, Timer.Tick );
	log.push(s);
	
	var Chan = Board.getChanDatas();

	chanstr('PPU CH:0 RX', Chan.Ppu.Rx[0]);
	chanstr('PPU CH:1 RX', Chan.Ppu.Rx[1]);
	chanstr('PPU CH:2 RX', Chan.Ppu.Rx[2]);
	chanstr('PPU CH:0 TX', Chan.Ppu.Tx[0]);
	chanstr('PPU CH:1 TX', Chan.Ppu.Tx[1]);
	
	chanstr('CPU CH:0 RX', Chan.Cpu.Rx[0]);
	chanstr('CPU CH:1 RX', Chan.Cpu.Rx[1]);
	chanstr('CPU CH:0 TX', Chan.Cpu.Tx[0]);
	chanstr('CPU CH:1 TX', Chan.Cpu.Tx[1]);
	chanstr('CPU CH:2 TX', Chan.Cpu.Tx[2]);
	}
}

function pstr(s, f, v) {
	return s + (f ? v.toString(8) : 0);
}

function chanstr(s, O) {
	log.push(s + ' D:' + (O.data?OCT(O.data).substr(3):"   ") +
		' RDY:' + O.ready + ' IRQ:' + O.irq.toString(8));
}

this.ticker = function( processor ) {
	if(Trace)
		log.push( "Ticks: " + processor.Tick );
}

this.irq = function( processor, n, I ) {
	if(Trace) {
		var pc = processor.getPC();
		log.push( "#" + (++counter) + ". " + processor.name + ': ' +
			OCT(pc) + ': ' + ' virq['+(I?I:0)+'.]: IRQ ' + n.toString(8) );
	}
}

this.splitter = function( n ) {
	if(Trace)
		log.push( "Splitter " + n );
}

return this;

}