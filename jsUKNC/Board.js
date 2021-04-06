/* 
	
	Motherboard class implementation (minimal)
	(ToDo:
		Network, Serial, Parallel, HardDisks, Cartridges, Audio on speaker
		This version is short and intended to run known UKNC games.
		)
*/

// Timer ticker (global)
var Timer = {	/*uint16_t*/Tick: 0,	// timer current value, port 177714
			/*uint16_t*/reload: 0,		// timer reload value, port 177712
			/*uint16_t*/flags: 0,		// timer status value, port 177710
			/*uint16_t*/divider: 0
		};
		
// Memory (global for better access
var /*uint8_t[]*/ RAM = [];		// [3][] RAM, three planes, 64 KB each
var /*uint8_t[]*/ ROM;			// System ROM, 32 KB

// NOT realized, just defined
var /*uint8_t[]*/ ROMCart = [];	// [2][] ROM cartridges #1 and #2, 24 KB each
var /*uint8_t[]*/ HardDrives = [];	//[2] HDD control	(ToDo, not in this version)

// Audio sound generator for the default speaker
// is not realized in this version.

Motherboard  = function()
{
	var self = this;
	
	
// Timing
	var /*uint16_t*/    multiply = 1;
	
	var freq = {
		per: [],	/*uint16_t[6]*/
		out: [],	/*uint16_t[6]*/
		enable: []	/*uint16_t[6]*/
	};
	
	function chan_struct() {
		return {
		/*uint8_t*/ data:0,
		/*uint8_t*/ ready:0,
		/*uint8_t*/ irq:0,
		/*uint8_t*/ rdwr:0
		};
	}

	function ChanGen(n) {
		var a=[];
		while((n--)>0) a.push(new chan_struct());
		return a;
		}
		
	function c_struct() { return { Tx:[], Rx:[] }; }
    var Chan = {
		Cpu: new c_struct(),
		Ppu: new c_struct()
		};
	this.getChanDatas = function() { return Chan; }

    var /*uint8_t*/		chan0disabled;
    var /*uint8_t*/		irq_cpureset;

    var /*uint8_t*/		scanned_key;
	
	function kbd_row() {
		return {
		/*uint8_t*/ processed:0,
		/*uint8_t*/ row_Y:0
		};
	}
	
	function kbdrw(n) { var a=[]; while((n--)>0) a.push( new kbd_row()); return a;}
	var kbd_matrix;

	var frExec = [];        // for Ukncbtl case one frame Execute calls for Cpu, PPu

	
function init() {

	for( i=0; i<12; i++ ) {
		frExec.push( { p:0, f:Cpu.Execute } );
		frExec.push( { p:1, f:Ppu.Execute } );
		if(i%3 == 2) frExec.push( { p:0, f:Cpu.Execute } );
		}


	var i;
	for( i=0; i<6; i++ ) {
		freq.per[i] = 0;
		freq.out[i] = 0;
		freq.enable[i] = 0;
	}
	
    Chan.Cpu.Tx = new ChanGen(3);
	Chan.Cpu.Rx = new ChanGen(2);
    Chan.Ppu.Tx = new ChanGen(2);
	Chan.Ppu.Rx = new ChanGen(3);


    // Allocate memory for RAM and ROM
    RAM[0] = /*uint8_t*/ memset( [], 0, 65536);
    RAM[1] = /*uint8_t*/ memset( [], 0, 65536);
    RAM[2] = /*uint8_t*/ memset( [], 0, 65536);
    ROM    = /*uint8_t*/ memset( [], 0, 32768);
    ROMCart[0] = [];
    ROMCart[1] = [];		// not realized in this version
}

init();		// now


/*void*/ this.Reset = function()
{
    Ppu.SetDCLOPin(true);
    Ppu.SetACLOPin(true);

    FloppyCtl.Reset();

	Timer.Tick = 0;
	Timer.reload = 0;
	Timer.status = 0;
	Timer.divider = 0;

    chan0disabled = 0;
    scanned_key = 0;
    kbd_matrix = new kbdrw(16);
	kbd_matrix[3].row_Y = 0xFF;

    // We always start with Ppu
    Ppu.SetDCLOPin(false);
    Ppu.SetACLOPin(false);
	
	keyboard.reset();
	cheats.reset();
}

//
// Memory control
//
// There is a little optimisation in Board.js, but mostly the same

/*uint16_t*/ this.GetROMWord = function(/*uint16_t*/ n)
{
	var i = n & 0xFFFE;		// n < 32768
    return /*uint16_t*/ ((ROM[i+1]<<8) | ROM[i]);
}

/*uint8_t*/ this.GetROMByte = function(/*uint16_t*/ n)
{
    return ROM[n];		// n < 32768
}

/*uint16_t*/ this.GetROMCartWord = function(/*int*/ c, /*uint16_t*/ n)
{
    return 0;
}

/*uint8_t*/ this.GetROMCartByte = function(c, /*uint16_t*/ n)
{
    return 0;
}

/*uint16_t*/ this.GetRAMWord = function(p, /*uint16_t*/ n)
{
	var i = (n & 0xFFFE);
    return /*uint16_t*/ ((RAM[p][i+1]<<8) | RAM[p][i]);
}

/*uint8_t*/ this.GetRAMByte = function(p, /*uint16_t*/ n)
{
    return RAM[p][n];
}

/*void*/ this.SetRAMWord = function(p, /*uint16_t*/ n, /*uint16_t*/ word)
{
	var i = (n & 0xFFFE), i1=i+1;
	
	RAM[p][i] = word & 255;
	RAM[p][i1] = (word>>>8) & 255;
	
	 // screen update, faster than "redraw all" in most cases
	if (Px_) {
		if(typeof(Px[i])!=="undefined") scr.update(i);
		if(typeof(Px[i1])!=="undefined") scr.update(i1);
		}
}

/*void*/ this.SetRAMByte = function(p, /*uint16_t*/ n, /*uint8_t*/ b)
{
    RAM[p][n] = b & 255;
	if (Px_ && typeof(Px[n])!=="undefined") scr.update(n);
}

/*void*/ this.LoadROM = function(/*const uint8_t*/ pBuffer)  // Load 32 KB ROM image from the buffer
{
    memcpy(ROM, pBuffer, 32768);
}


// Cartridges (Not in this version)
function /*bool*/ IsROMCartridgeLoaded(/*int*/ n) /*const*/
{
    return 0;
}


// Hard Drives (Not in this version)

/*bool*/ this.IsHardImageAttached = function(/*int*/ slot) /*const*/
{
    return 0;
}

function /*bool*/ IsHardImageReadOnly(/*int*/ slot) /*const*/
{
    return 1;
}

/*uint16_t*/ this.GetHardPortWord = function(/*int*/ slot, /*uint16_t*/ port)
{
    return 0;
}

/*void*/ this.SetHardPortWord = function(/*int*/ slot, /*uint16_t*/ port, /*uint16_t*/ data)
{
    return;
}

 
/*---

 Timer ticker functions, reading, setting,  ticker--, status, reload when empty

----*/

function /*void*/ TimerTick() // Timer Tick, 2uS -- dividers are within timer routine
{
	// System timer tick
	// if Timer is on  && External event not ready
	if ( ((Timer.flags & 1) != 0) &&  ((Timer.flags & 32 /*040*/)==0 ) ) {

		Timer.divider++;

		var g = ((Timer.flags >>> 1) & 3);
		if((g==0) || (Timer.divider >= (1<<g)))
			{
			Timer.divider = 0;
			Timer.Tick = ((--Timer.Tick) & 4095)>>>0; /*07777*/  // 12 bit only

			if (Timer.Tick == 0)
				{
				if (Timer.flags & 128 /*0200*/ )
					Timer.flags |= 8; /*010*/ // Overflow
				Timer.flags |= 128; /*0200*/  // 0

				if ((Timer.flags & 64 /*0100*/ ) && (Timer.flags & 128 /*0200*/))
					{
					Ppu.VIRQ(2, 196 /*0304*/ );
					}

				Timer.Tick = Timer.reload & 4095; /*07777*/ // Reload it
				}
			}
	}
}

// reads timer, with updates

/*uint16_t*/ this.GetTimerValue = function()  // Returns current timer value, port 0177714
{
    if ((Timer.flags & 160 /*0240*/ ) == 0)
        return Timer.Tick;

    Timer.flags &= (~160); /*0240*/  // Clear flags
    var /*uint16_t*/ res = Timer.Tick;
    Timer.Tick = Timer.reload & 4095; /*07777*/  // Reload it
    return res;
}

/*uint16_t*/ this.GetTimerReload = function()  // Returns timer reload value, port 0177712
{
    return Timer.reload;
}

/*uint16_t*/ this.GetTimerState = function() // Returns timer state, port 0177710
{
    var /*uint16_t*/ res = Timer.flags;
    Timer.flags &= (~8); /*010*/  // Clear overflow
    return res;
}

// sets timer values

/*void*/ this.SetTimerReload = function(/*uint16_t*/ val)	 // Sets timer reload value
{
    Timer.reload = val & 4095; /*07777*/
    if ((Timer.flags & 1) == 0)
        Timer.Tick = Timer.reload;
}

/*void*/ this.SetTimerState = function(/*uint16_t*/ val) // Sets timer state
{
    // 753   200 40 10
    if ((val & 1) && ((Timer.flags & 1) == 0))
        Timer.v = Timer.reload & 4095; /*07777*/

    Timer.flags &= 168; /*0250*/   // Clear everything but bits 7,5,3
    Timer.flags |= (val & ((~168) /*0250*/ ));  // Preserve bits 753

    multiply = (1<<(3-((Timer.flags>>>1)&3)));
}

// Debug Step F7 mode, to process a few operators only

/*void*/ this.DebugTicks = function()
{
    if (!Ppu.Stopped)
    {
        while (Ppu.IRQ()) {}
        Ppu.CmdExe();
        while (Ppu.IRQ()) {}
    }
    if (!Cpu.Stopped)
    {
        while (Cpu.IRQ()) {}
        Cpu.CmdExe();
        while (Cpu.IRQ()) {}
    }
    if (!Ppu.Stopped) while (Ppu.IRQ()) {}
}

/* =====

** Should be, as originally in UKNCBTL

Emulator loops (25 frames per second), pausing in-between is ~20ms,upto 40ms (1000/25 = 40)
Each frame is 1/25 sec = 40 ms = 20000 ticks.

20000 ticks of the system timer - on each 1-tick
2 signals EVNT, on 0. and 10000. frame tick
320000 CPU ticks - 16 times for one tick, 320K * 25 = 8 millions (8MHz)
250000 PPU ticks - 12.5 times for one tick, 250K * 25 = 6,25 millions (6,25MHz)

Drawing of 288 rows of the screen takes 32 ticks per one row (only first half of the frame)
 * The first invisible row (#0) - drawing starts on 96. tick
 * The first visible row (#18) - drawing starts on 672. tick
625 ticks FDD - each 32. tick
48 ticks data exchange through COM-ports - each 416. tick
8?? ticks data exchange through NET-ports - each 64. tick ???

** Notes:
Drawing is done in CANVAS from outside, ticks ignored.
40*20K*28,5*instruction / per second    - too slow to be JS processed with drawings.
Most programs can run:
20*100*2*16*instruction / per second 	- is little slower, but works.
Games need less cycles, there is much wait-pausing inside programs.
Also the Timer and counter of ticks can be optimised, avoid loops and redundant empty function calls.
Each instruction sets ticker to skip ~30 next ticks. So, skip them, not process.

======= */

// Breakpoints are ok, can use. Just removed for better performance.

// this is the most original with proper timings and good to compare log files
/*bool*/ this.SystemFrame_ukncbtl = function()
{
	var frameticks = 0;
	
    do
    {
        TimerTick();  // System timer tick

        if (frameticks % 10000 == 0)
            Tick50();  // 1/50 timer event

        // Cpu - 16 times, Ppu - 12.5 times
		
        if (!Cpu.bp && !Ppu.bp )  // No breakpoints, no need to check
        {
			for(var i=0; i<28; i++) {
				frExec[i].f();
				//if(dbg.breakpoints( frExec[i].p==0 ? Cpu : Ppu )) return false;
				}
            if ((frameticks & 1) == 0)  // (frameticks % 2 == 0) Ppu extra ticks
				{
                frExec[1].f();
				//if(dbg.breakpoints(Ppu)) return false;
				}
        }
        else  // Have breakpoint, need to check
        {
			for(var i=0; i<28; i++) {
				var o = frExec[i];
				o.f();
				if (o.p == 0) {
					//if(dbg.breakpoints(Cpu)) return false;
					if(Cpu.getPC() == Cpu.bp) {
						return false;
						}
					}
				else {
					//if(dbg.breakpoints(Ppu)) return false;
					if(Ppu.getPC() == Ppu.bp) {
						return false;
						}						
					}
				}
				
            if ((frameticks & 1) == 0)  // (frameticks % 2 == 0) Ppu extra ticks
                frExec[1].f();		
		
        }

        if ((frameticks & 31) == 0) { //  Floppy, Keyboard	(frameticks % 32 == 0)
			FloppyCtl.Periodic();  // Each 32nd tick -- FDD tick
			Tick32();
			}

        if (frameticks % 23 == 0) //AUDIO tick %23
            DoSound();				// count channels too, if we want to save
			
		//OtherDevices();
		
        frameticks++;
    }
    while (frameticks < 20000);
	
    trace.splitter(0);

    return true;
}

/*------------------

 Optimised version.
 
	0- Precise UKNCBTL to compare results
	1- Clear timing after instructions (default and fast)
	2- Recalculate tickers, but no big deal

----------------*/

/*bool*/ this.SystemFrame = function()
{
	// Now comes a very experimental hack on
	// how to make UKNC run quite a smoothly.

	var /*int*/ B = speed.bunch;	//	only 100 loop can be enough.
	var OZ = speed.OZ;

	var m,i,oz;
	
    do
    {
		TimerTick();
			
		oz = OZ;
		i=16;
		
		if(oz) {
			m = i-1;
			if(m>Cpu.Tick) m=Cpu.Tick;
			if(m>3 && m>Ppu.Tick) m=Ppu.Tick;
			if(m>3 && m>Timer.Tick) m=Timer.Tick;
			if(m>3) {
						Cpu.Tick-=m;
						Ppu.Tick-=m;
						i-=m;
					}
				}
		
		// Same for CPU, PPU. No big difference.
		for(; i>0; i--) {
						
				if(Cpu.Tick) Cpu.Tick--;
				else {
					Cpu.Execute();
					//if(dbg.breakpoints(Cpu)) return false;
					if(Cpu.bp && Cpu.getPC() == Cpu.bp) return false;
					}

				if(Ppu.Tick) Ppu.Tick--;
				else {
					Ppu.Execute();
					//if(dbg.breakpoints(Ppu)) return false;
					if(Ppu.bp && Ppu.getPC() == Ppu.bp) return false;
					}
				
				if(speed.cc) {		// This makes it really fast. But with glitches.
					Cpu.Tick = 0;
					Ppu.Tick = 0;
					continue;
					}
				
				// Recalculates ticks, but not fast anyway.
				
					if(oz && Cpu.Tick && Ppu.Tick) {
						oz = 0;		// one time optimizer
						m = i;
						if(m>3 && m>Cpu.Tick) m=Cpu.Tick;
						if(m>3 && m>Ppu.Tick) m=Ppu.Tick;
						if(m>3 && m>Timer.Tick) m=Timer.Tick;
						if(m>3) {
							Cpu.Tick-=m;
							Ppu.Tick-=m;
							i-=m;
							}
						}

			}
			
			if ((B & 31) == 0) FloppyCtl.Periodic();  // Each 32nd tick -- FDD tick	
			
			Tick32();		// very frequent, keyboard processing
			
				//AUDIO tick (do not care, just play a game)
			//if (B % 23 == 0) 
			//	DoSound();
			
			//OtherDevices();

    }
    while (--B);
	
	Tick50();  // 1/50 timer event, much frequent here
	
    return true;
}



function /*void*/ Tick50 ()
{
    if ((Port.o177054 & 256 /*0400*/ ) == 0)		// 177054 - address space selected (ROM,RAM)
        { Ppu.TickEVNT(); scr.DRAW(); }
    if ((Port.o177054 & 512 /*01000*/ ) == 0)
        Cpu.TickEVNT();
}

// keyboard
function Tick32() {

	for(var q=0; q<speed.kN; q++) {
            // Keyboard processing
            if ((Port.o177700 & 128 /*0200*/ ) == 0)
            {
                var /*uint8_t*/ row_Y = scanned_key & 15;
                var K = kbd_matrix[row_Y];
                var /*uint8_t*/ col_X = ((scanned_key & 0x70) >>> 4);
                var /*uint8_t*/ bit_X = (1 << col_X);
                Port.o177702 = scanned_key;

                if ((scanned_key & 128 /*0200*/ ) == 0)
                {
                    if ((K.processed == 0) && ((K.row_Y & bit_X) != 0))
                    {
                        Port.o177700 |= 128; /*0200*/
                        K.processed = 1; j=99;
                        if (Port.o177700 & 64 /*0100*/ )
                            Ppu.VIRQ(3, 192 /*0300*/ );
                    }
                }
                else
                {
                    if ((K.processed != 0) && (K.row_Y == 0))
                    {
                        Port.o177700 |= 128; /*0200*/
                        K.processed = 0; j=99;
                        if (Port.o177700 & 64 /*0100*/ )
                            Ppu.VIRQ(3, 192 /*0300*/ );
                        Port.o177702 = scanned_key & 0x8F;
                    }
                }
				
                /*uint_8*/ scanned_key = (++scanned_key)&255;
				if(!scanned_key) keyboard.processNextKey();
            }
	}
}
		
this.GetScannedKey = function() {
 return scanned_key;
 }

// Key pressed or released
/*void*/ this.KeyboardEvent = function(/*uint8_t*/ scancode, /*bool*/ okPressed)
{
    var /*uint8_t*/ row_Y = scancode & 15;
    var /*uint8_t*/ col_X = ((scancode & 0x70) >>> 4);
    var /*uint8_t*/ bit_X = 1 << col_X;
    if (okPressed)
        kbd_matrix[row_Y].row_Y |= bit_X;
    else
        kbd_matrix[row_Y].row_Y &= (~bit_X);
}



/*void*/ this.ChanWriteByCpu = function(/*uint8_t*/ ch, /*uint8_t*/ data)
{
    var /*uint8_t*/ o_ready = Chan.Ppu.Rx[ch].ready;
    ch &= 3;

    Chan.Ppu.Rx[ch].data = data;
    Chan.Ppu.Rx[ch].ready = 1;
    Chan.Cpu.Tx[ch].ready = 0;
    Chan.Cpu.Tx[ch].rdwr = 1;
    Cpu.VIRQ(((ch == 2) ? 5 : (2 + (ch * 2))), 0);
    if ((Chan.Ppu.Rx[ch].irq) && (o_ready == 0))
    {
        Chan.Ppu.Rx[ch].rdwr = 0;
        Ppu.VIRQ(5 + (ch * 2), 208 /*0320*/  + (8 /*010*/  * ch));
    }

}

/*void*/ this.ChanWriteByPpu = function(/*uint8_t*/ ch, /*uint8_t*/ data)
{
    var /*uint8_t*/ o_ready = Chan.Cpu.Rx[ch].ready;
    ch &= 3;

    Chan.Cpu.Rx[ch].data = data;
    Chan.Cpu.Rx[ch].ready = 1;
    Chan.Ppu.Tx[ch].ready = 0;
    Chan.Ppu.Tx[ch].rdwr = 1;
    Ppu.VIRQ(((ch==0)?6:8), 0);
    if ((Chan.Cpu.Rx[ch].irq) && (o_ready == 0))
    {
        Chan.Cpu.Rx[ch].rdwr = 0;
        Cpu.VIRQ((ch?3:1), (ch ? 304 /*0460*/ : 48 /*060*/));
    }
}

/*uint8_t*/ this.ChanReadByCpu = function(/*uint8_t*/ ch)
{
    var /*uint8_t*/ res, o_ready = Chan.Ppu.Tx[ch].ready;

    ch &= 3;

    res = Chan.Cpu.Rx[ch].data;
    Chan.Cpu.Rx[ch].ready = 0;
    Chan.Cpu.Rx[ch].rdwr = 1;
    Chan.Ppu.Tx[ch].ready = 1;
    Cpu.VIRQ((ch * 2) + 1, 0);
    if ((Chan.Ppu.Tx[ch].irq) && (o_ready == 0))
    {
        Chan.Ppu.Tx[ch].rdwr = 0;
        Ppu.VIRQ((ch?8:6), (ch ? 220 /*0334*/ : 212 /*0324*/));
    }
    return (res & 255);
}

/*uint8_t*/ this.ChanReadByPpu = function(/*uint8_t*/ ch)
{
    var /*uint8_t*/ res, o_ready = Chan.Cpu.Tx[ch].ready;

    ch &= 3;

    //if((ch==0)&&(chan0disabled))
    //	return 0;

    res = Chan.Ppu.Rx[ch].data;
    Chan.Ppu.Rx[ch].ready = 0;
    Chan.Ppu.Rx[ch].rdwr = 1;
    Chan.Cpu.Tx[ch].ready = 1;
    Ppu.VIRQ((ch * 2) + 5, 0);
    if ((Chan.Cpu.Tx[ch].irq) && (o_ready == 0))
    {
        Chan.Cpu.Tx[ch].rdwr = 0;
        switch (ch)
        {
        case 0:
            Cpu.VIRQ(2, 52 /*064*/ );
            break;
        case 1:
            Cpu.VIRQ(4, 308 /*0464*/ );
            break;
        case 2:
            Cpu.VIRQ(5, 316 /*0474*/ );
            break;
        }
    }

    return (res & 255);
}

/*uint8_t*/ this.ChanRxStateGetCpu = function(/*uint8_t*/ ch)
{
    ch &= 3;

    return ((Chan.Cpu.Rx[ch].ready << 7) | (Chan.Cpu.Rx[ch].irq << 6)) & 255;
}

/*uint8_t*/ this.ChanTxStateGetCpu = function(/*uint8_t*/ ch)
{
    ch &= 3;

    return ((Chan.Cpu.Tx[ch].ready << 7) | (Chan.Cpu.Tx[ch].irq << 6)) & 255;
}

/*uint8_t*/ this.ChanRxStateGetPpu = function()
{
    var /*uint8_t*/ res = (irq_cpureset << 6) | (Chan.Ppu.Rx[2].ready << 5) |
		(Chan.Ppu.Rx[1].ready << 4) | (Chan.Ppu.Rx[0].ready << 3) |
          (Chan.Ppu.Rx[2].irq << 2)   | (Chan.Ppu.Rx[1].irq << 1)   | (Chan.Ppu.Rx[0].irq);

    return (res & 255);
}

/*uint8_t*/ this.ChanTxStateGetPpu = function()
{
    var /*uint8_t*/ res = (Chan.Ppu.Tx[1].ready << 4) | (Chan.Ppu.Tx[0].ready << 3) |
		(chan0disabled << 2) | (Chan.Ppu.Tx[1].irq << 1)   | (Chan.Ppu.Tx[0].irq);

    return (res & 255);
}

/*void*/ this.ChanRxStateSetCpu = function(/*uint8_t*/ ch, /*uint8_t*/ state)
{
    var /*uint8_t*/ o_irq = Chan.Cpu.Rx[ch].irq;
    ch &= 3;

    if (state & 64 /*0100*/ ) //irq
        Chan.Cpu.Rx[ch].irq = 1;
    else
    {
        Chan.Cpu.Rx[ch].irq = 0;
        if ((ch == 0) || (Cpu.getVIRQ(ch?3:1))) Chan.Cpu.Rx[ch].rdwr = 1;
        Cpu.VIRQ(ch?3:1,0);
    }
    if ((Chan.Cpu.Rx[ch].irq) && (Chan.Cpu.Rx[ch].ready) && (o_irq == 0) && (Chan.Cpu.Rx[ch].rdwr))
    {
        Chan.Cpu.Rx[ch].rdwr = 0;
        Cpu.VIRQ((ch?3:1), (ch ? 304 /*0460*/ : 48 /*060*/));
    }
}

/*void*/ this.ChanTxStateSetCpu = function(/*uint8_t*/ ch, /*uint8_t*/ state)
{
    var /*uint8_t*/ o_irq = Chan.Cpu.Tx[ch].irq;
    ch &= 3;

    if (state & 64 /*0100*/ ) //irq
        Chan.Cpu.Tx[ch].irq = 1;
    else
    {
        Chan.Cpu.Tx[ch].irq = 0;
        if ((ch == 0) || (Cpu.getVIRQ((ch == 2) ? 5 : ((ch*2) + 2)))) Chan.Cpu.Tx[ch].rdwr = 1;
        Cpu.VIRQ(((ch == 2) ? 5 : ((ch*2) + 2)), 0);
    }

    if ((Chan.Cpu.Tx[ch].irq) && (Chan.Cpu.Tx[ch].ready) && (o_irq == 0) && (Chan.Cpu.Tx[ch].rdwr))
    {
        Chan.Cpu.Tx[ch].rdwr = 0;
        switch (ch)
        {
        case 0:
            Cpu.VIRQ(2, 52 /*064*/ );
            break;
        case 1:
            Cpu.VIRQ(4, 308 /*0464*/ );
            break;
        case 2:
            Cpu.VIRQ(5, 316 /*0474*/ );
            break;
        }
    }
}

/*void*/ this.ChanRxStateSetPpu = function(/*uint8_t*/ state)
{
    var /*uint8_t*/ o_irq0 = Chan.Ppu.Rx[0].irq;
    var /*uint8_t*/ o_irq1 = Chan.Ppu.Rx[1].irq;
    var /*uint8_t*/ o_irq2 = Chan.Ppu.Rx[2].irq;

    Chan.Ppu.Rx[0].irq = state & 1;
    Chan.Ppu.Rx[1].irq = (state >>> 1) & 1;
    Chan.Ppu.Rx[2].irq = (state >>> 2) & 1;
    irq_cpureset = (state >>> 6) & 1;

    if (Chan.Ppu.Rx[0].irq == 0)
    {
        if (Ppu.getVIRQ(5)) Chan.Ppu.Rx[0].rdwr = 1;
        Ppu.VIRQ(5, 0);
    }
    if (Chan.Ppu.Rx[1].irq == 0)
    {
        if (Ppu.getVIRQ(7)) Chan.Ppu.Rx[1].rdwr = 1;
        Ppu.VIRQ(7, 0);
    }
    if (Chan.Ppu.Rx[2].irq == 0)
    {
        if (Ppu.getVIRQ(9)) Chan.Ppu.Rx[2].rdwr = 1;
        Ppu.VIRQ(9, 0);
    }

    if ((Chan.Ppu.Rx[0].irq) && (Chan.Ppu.Rx[0].ready) && (o_irq0 == 0) && (Chan.Ppu.Rx[0].rdwr))
    {
        Chan.Ppu.Rx[0].rdwr = 0;
        Ppu.VIRQ(5, 208 /*0320*/ );
    }
    if ((Chan.Ppu.Rx[1].irq) && (Chan.Ppu.Rx[1].ready) && (o_irq1 == 0) && (Chan.Ppu.Rx[1].rdwr))
    {
        Chan.Ppu.Rx[1].rdwr = 0;
        Ppu.VIRQ(7, 216 /*0330*/ );
    }
    if ((Chan.Ppu.Rx[2].irq) && (Chan.Ppu.Rx[2].ready) && (o_irq2 == 0) && (Chan.Ppu.Rx[2].rdwr))
    {
        Chan.Ppu.Rx[2].rdwr = 0;
        Ppu.VIRQ(9, 224 /*0340*/ );
    }

}

/*void*/ this.ChanTxStateSetPpu = function(/*uint8_t*/ state)
{
    var /*uint8_t*/ o_irq0 = Chan.Ppu.Tx[0].irq;
    var /*uint8_t*/ o_irq1 = Chan.Ppu.Tx[1].irq;

    Chan.Ppu.Tx[0].irq = state & 1;
    Chan.Ppu.Tx[1].irq = (state >>> 1) & 1;
    chan0disabled = (state >>> 2) & 1;

    if (Chan.Ppu.Tx[0].irq == 0)
    {
        if (Ppu.getVIRQ(6)) Chan.Ppu.Tx[0].rdwr = 1;
        Ppu.VIRQ(6, 0);
    }
    if (Chan.Ppu.Tx[1].irq == 0)
    {
        if (Ppu.getVIRQ(8)) Chan.Ppu.Tx[1].rdwr = 1;
        Ppu.VIRQ(8, 0);
    }

    if ((Chan.Ppu.Tx[0].irq) && (Chan.Ppu.Tx[0].ready) && (o_irq0 == 0) && (Chan.Ppu.Tx[0].rdwr))
    {
        Chan.Ppu.Tx[0].rdwr = 0;
        Ppu.VIRQ(6, 212 /*0324*/ );
    }
    if ((Chan.Ppu.Tx[1].irq) && (Chan.Ppu.Tx[1].ready) && (o_irq1 == 0) && (Chan.Ppu.Tx[1].rdwr))
    {
        Chan.Ppu.Tx[1].rdwr = 0;
        Ppu.VIRQ(8, 220 /*0334*/ );
    }
}

/*void*/ this.ChanResetByCpu = function()
{
	var O = Chan.Cpu.Rx[0];
	O.ready = 0;
    O.irq = 0;
    O.rdwr = 1;
    Cpu.VIRQ(1, 0);
    O = Chan.Ppu.Tx[0];
    O.ready = 1;
    if (O.irq)
    {
        O.rdwr = 0;
        Ppu.VIRQ(6, 212 /*0324*/ );
    }

    O = Chan.Cpu.Tx[0];
    O.ready = 1;
    O.irq = 0;
    O.rdwr = 1;
    Cpu.VIRQ(2, 0);
    O = Chan.Ppu.Rx[0];
    O.ready = 0;
    O.rdwr = 1;
    Ppu.VIRQ(5, 0);

    O = Chan.Cpu.Rx[1];
    O.ready = 0;
    O.irq = 0;
    O.rdwr = 1;
    Cpu.VIRQ(3, 0);
    O = Chan.Ppu.Tx[1];
    O.ready = 1;
    if (O.irq)
    {
        O.rdwr = 0;
        Ppu.VIRQ(8, 220 /*0334*/ );
    }

    O = Chan.Cpu.Tx[1];
    O.ready = 1;
    O.irq = 0;
    O.rdwr = 1;
    Cpu.VIRQ(4, 0);
    O = Chan.Ppu.Rx[1];
    O.ready = 0;
    O.rdwr = 1;
    Ppu.VIRQ(7, 0);

    O = Chan.Cpu.Tx[2];
    O.ready = 1;
    O.irq = 0;
    O.rdwr = 1;
    Cpu.VIRQ(5, 0);
    O = Chan.Ppu.Rx[2];
    O.ready = 0;
    O.rdwr = 1;
    Ppu.VIRQ(9, 0);

    if (irq_cpureset)
        Ppu.VIRQ(4, 204 /*0314*/ );
}

/*void*/ this.ChanResetByPpu = function()
{
    var O = Chan.Ppu.Rx[0];
    O.ready = 0;
    O.irq = 0;
    O.rdwr = 1;
    Ppu.VIRQ(5, 0);
    O = Chan.Cpu.Tx[0];
    O.ready = 1;
    if (O.irq)
    {
        O.rdwr = 0;
        Cpu.VIRQ(2, 52 /*064*/ );
    }

    O = Chan.Ppu.Tx[0];
    O.ready = 1;
    O.irq = 0;
    O.rdwr = 1;
    Ppu.VIRQ(6, 0);
    O = Chan.Cpu.Rx[0];
    O.ready = 0;
    O.rdwr = 1;
    Cpu.VIRQ(1, 0);

    O = Chan.Ppu.Rx[1];
    O.ready = 0;
    O.irq = 0;
    O.rdwr = 1;
    Ppu.VIRQ(7, 0);
    O = Chan.Cpu.Tx[1];
    O.ready = 1;
    if (O.irq)
    {
        O.rdwr = 0;
        Cpu.VIRQ(4, 308 /*0464*/ );
    }

    O = Chan.Ppu.Tx[1];
    O.ready = 1;
    O.irq = 0;
    O.rdwr = 1;
    Ppu.VIRQ(8, 0);
    O = Chan.Cpu.Rx[1];
    O.ready = 0;
    O.rdwr = 1;
    Cpu.VIRQ(3, 0);

    O = Chan.Ppu.Rx[2];
    O.ready = 0;
    O.irq = 0;
    O.rdwr = 1;
    Ppu.VIRQ(9, 0);
    O = Chan.Cpu.Tx[2];
    O.ready = 1;
    if (O.irq)
    {
        O.rdwr = 0;
        Cpu.VIRQ(5, 316 /*0474*/ );
    }

    irq_cpureset = 0;
    Ppu.VIRQ(4, 0);
}


/*uint16_t*/ this.GetKeyboardRegister = function()
{
    var /*uint16_t*/ w7214 = self.GetRAMWord(0, 3724 /*07214*/ );
    var /*uint8_t*/ b22556 = self.GetRAMByte(0, 9582 /*022556*/ );

    var /*uint16_t*/ res = 0;
    switch (w7214)
    {
    case 4444 /*010534*/ : //fix
    case 3740 /*07234*/ :  //main
        res = (b22556 & 128 /*0200*/ ) ? KEYB.RUS : KEYB.LAT;
        break;
    case 3916 /*07514*/ : //lower register
        res = (b22556 & 128 /*0200*/ ) ? (KEYB.RUS | KEYB.LOWERREG) : (KEYB.LAT | KEYB.LOWERREG);
        break;
    case 4092 /*07774*/ : //graph
        res = KEYB.GRAF;
        break;
    case 4268 /*010254*/ : //control
        res = KEYB.LAT | KEYB.UPR;
        break;
    default:
        res = KEYB.LAT;
        break;
    }
    return res;
}

function /*void*/ DoSound()
{

    freq.out[0] = (Timer.Tick >> 3) & 1; //8000
    if (multiply >= 4)
        freq.out[0] = 0;

    freq.out[1] = (Timer.Tick >> 6) & 1; //1000

    freq.out[2] = (Timer.Tick >> 7) & 1; //500
    freq.out[3] = (Timer.Tick >> 8) & 1; //250
    freq.out[4] = (Timer.Tick >> 10) & 1; //60

    var /*int*/ g = !(freq.out[0] & freq.enable[0]) & ! (freq.out[1] & freq.enable[1]) &
		!(freq.out[2] & freq.enable[2]) & !(freq.out[3] & freq.enable[3]) & !(freq.out[4] & freq.enable[4]);
    if (freq.enable[5] == 0)
        g = 0;
    else
    {
        if ( (!freq.enable[0]) && (!freq.enable[1]) && (!freq.enable[2]) &&
			(!freq.enable[3]) && (!freq.enable[4]))
            g = 1;
    }

    if(sound.On) sound.updateBit(g);
}

/*void*/ this.SetSound = function(/*uint16_t*/ val)
{
    freq.enable[5] = ((val & (1 << 7)) ? 1 : 0 );
//12 11 10 9 8
    freq.enable[0] = ((val & (1 << 12)) ? 1 : 0 );
    freq.enable[1] = ((val & (1 << 11)) ? 1 : 0 );
	freq.enable[2] = ((val & (1 << 10)) ? 1 : 0 );
	freq.enable[3] = ((val & (1 << 9)) ? 1 : 0 );
	freq.enable[4] = ((val & (1 << 8)) ? 1 : 0 );
}

/* NOT USED, but left */
function OtherDevices() {

	// If Cassette2 with driver is used and IDE drives connected, then .img can be attached in UKNCBTL
	if(HardDrives.length) {
       if (HardDrives[0] != null)
            HardDrives[0].Periodic();
        if (HardDrives[1] != null)
            HardDrives[1].Periodic();
		}
	
	if (0 /*Tape*/)
        {
            tapeBrasErr += tapeSamplesPerFrame;
            if (2 * tapeBrasErr >= 20000)
            {
                tapeBrasErr -= 20000;

                if (TapeReadCb != null)  // Tape reading
                {
                    var /*bool*/ tapeBit = TapeReadCb(1);
                    if (Ppu.MC.TapeInput(tapeBit))
                    {
                        Timer.flags |= 32; /*040*/  // Set bit 5 of timer state: external event ready to read
                    }
                }
                else if (TapeWriteCb != null)  // Tape writing
                {
                    var /*uint*/ value = (Ppu.MC.TapeOutput() ? 0xFFFFFFFF : 0);
                    TapeWriteCb(value, 1);
                }
            }
        }

	if(0) {	/* Serial port (C2 slot)*/
        if (0 /*SerialIn*/ && ticks % 416 == 0)
        {
            if ((Port.o176574 & 4 /*004*/ ) == 0)  // Not loopback?
            {
                var /*uint8_t*/ b = { value:0 };
                if (SerialInCb(b))
                {
                    if (Cpu.MC.SerialInput(b.value) && (Port.o176570 & 64 /*0100*/ ))
                        Cpu.VIRQ(7, 248 /*0370*/ );
                }
            }
        }
        if (0 /*SerialOut*/ && (ticks % 52 == 0))
        {
            if (serialTxCount > 0)
            {
                serialTxCount--;
                if (serialTxCount == 0)  // Translation countdown finished - the byte translated
                {
                    if ((Port.o176574 & 4 /*004*/ ) == 0)  // Not loopback?
                        SerialOutCb(/*uint8_t*/Port.o176576 & 255);
                    else  // Loopback
                    {
                        if (Cpu.MC.SerialInput(/*uint8_t*/Port.o176576 & 255) && (Port.o176570 & 64 /*0100*/ ))
                            Cpu.VIRQ(7, 248 /*0370*/ );
                    }
                    Port.o176574 |= 128; /*0200*/  // Set Ready flag
                    if (Port.o176574 & 64 /*0100*/ )  // Interrupt?
                        Cpu.VIRQ(8, 252 /*0374*/ );
                }
            }
            else if ((Port.o176574 & 128 /*0200*/ ) == 0)  // Ready is 0?
            {
                serialTxCount = 8;  // Start translation countdown
            }
        }
	}
	if(0) {	/* Network (CA controller) */
        if (0 /*NetworkInCb*/ && (ticks % 64 == 0))
        {
            if ((Port.o176564 & 4 /*004*/ ) == 0)  // Not loopback?
            {
                var /*uint8_t*/ b = { value:0 };
                if (NetworkInCb(b))
                {
                    if (Cpu.MC.NetworkInput(b.value) && (Port.o176560 & 64 /*0100*/ ))
                    {
                        Cpu.VIRQ(9, 240 /*0360*/ );
                    }
                }
            }
        }
        if (0 /*NetworkOut*/ && (ticks % 7 == 0))
        {
            if (networkTxCount > 0)
            {
                networkTxCount--;
                if (networkTxCount == 0)  // Translation countdown finished - the byte translated
                {
                    if ((Port.o176564 & 4 /*004*/ ) == 0)  // Not loopback?
                        NetworkOutCb(/*uint8_t*/Port.o176566 & 255);
                    else  // Loopback
                    {
                        if (Cpu.MC.NetworkInput(/*uint8_t*/(Port.o176566 & 255)) && (Port.o176560 & 64 /*0100*/ ))
                            Cpu.VIRQ(9, 240 /*0360*/ );
                    }
                    Port.o176564 |= 128; /*0200*/  // Set Ready flag
                    if (Port.o176564 & 64 /*0100*/ )  // Interrupt?
                    {
                        Cpu.VIRQ(10, 244 /*0364*/ );
                    }
                }
            }
            else if ((Port.o176564 & 128 /*0200*/ ) == 0)  // Ready is 0?
            {
                networkTxCount = 4;  // Start translation countdown
            }
        }
	}
	
    if (0 /*ParallelOut (to printer)*/)
        {
            if ((Port.o177102 & 0x80) == 0x80 && (Port.o177101 & 0x80) == 0x80)
            {
                // Strobe set, Printer Ack set => reset Printer Ack
                Port.o177101 &= (~0x80);
                // Now printer waits for a next byte
            }
            else if ((Port.o177102 & 0x80) == 0 && (Port.o177101 & 0x80) == 0)
            {
                // Strobe reset, Printer Ack reset => byte is ready, print it
                ParallelOutCb(Port.o177100);
                Port.o177101 |= 0x80;  // Set Printer Acknowledge
                // Now the printer waits for Strobe
            }
        }

}

//////////////////////////////////////////////////////////////////////
//
// Emulator image (.uknc) format:
//  Offset Size
//     0    32 bytes  - Header
//    32   128 bytes  - Board status
//   160    64 bytes  - Cpu status
//   224    64 bytes  - Ppu status
//   288    64 bytes  - Cpu memory/IO
//   352    64 bytes  - Ppu memory/IO
//   416    96 bytes  - reserved
//   512    --        - end of the header
//   512   32 Kbytes  - ROM image
//         64 Kbytes * 3  - RAM planes 0, 1, 2
//TODO: 256 bytes * 2 - Cartridge 1..2 path
//TODO: 256 bytes * 4 - Floppy 1..4 path
//TODO: 256 bytes * 2 - Hard 1..2 path
//TODO: Floppy drive state
//TODO: Hard drive state

/*void*/ this.SaveToImage = function()
{
 	var I = new Uint8Array( 229888 );		// .uknc file
 	var j=0,header = [0x55,0x4B,0x4E,0x43,0x42,0x54,0x4C,0x21,1,0,1,0,0,0x82,3,0];
 	while(j<16) I[j]=header[j++];
 	while(j<32) I[j++]=0;
 
    // Board data                                       // Offset Size
	var k,g, v,o = { i:32 };				// skip header 32 bytes
	
    waddI8( I,o, Timer.Tick  );				//   32     2
    waddI8( I,o, Timer.reload );			//   34     2
    waddI8( I,o, Timer.flags );				//   36     2
    waddI8( I,o, Timer.divider );			//   38     2
											//   40    40
	wrImgChan( Chan.Cpu.Tx, I, o );
	wrImgChan( Chan.Cpu.Rx, I, o );

	wrImgChan( Chan.Ppu.Tx, I, o );
	wrImgChan( Chan.Ppu.Rx, I, o );
	
	I[o.i++] = chan0disabled;					//   80     1
    I[o.i++] = irq_cpureset;					//   81     1
    I[o.i++] = 0;                              	//   82     1  // not used
    I[o.i++] = scanned_key;						//   83     1
	
	for(k=0;k<16;k++) {
		g = kbd_matrix[k];
		I[o.i++] = g.processed;
		I[o.i++] = g.row_Y;
		}										//  116    --

	waddI8( I,o, multiply );					//  116     2
	
	for(k=0;k<6;k++) {
		waddI8( I,o, freq.per[k] );				//  118    12
		}
	for(k=0;k<6;k++) {
		waddI8( I,o, freq.out[k] );				//  130    12
		}
	for(k=0;k<6;k++) {
		waddI8( I,o, freq.enable[k] );			//  142    12
		}
		
	o.i=160;	
    // Cpu status
    Cpu.SaveToImage(I,o);					//  160    32
	
	o.i=224;
    // Ppu status
    Ppu.SaveToImage(I,o);					//  224    32
	
	o.i=288;
    // Cpu memory/IO controller status
    Cpu.MC.SaveToImage(I,o);				//  288    64
	
	o.i=352;
    // Ppu memory/IO controller status
    Ppu.MC.SaveToImage(I,o);				//  352    64
	
	o.i=512;
	// ROM
    for(v=0; v<32768;v++) I[o.i++] = ROM[v];
    // RAM planes 0, 1, 2
    for(v=0; v<65536;v++) I[o.i++] = RAM[0][v];
    for(v=0;v<65536;v++) I[o.i++] = RAM[1][v];
    for(v=0;v<65536;v++) I[o.i++] = RAM[2][v];
	
	return I;
}



function wrImgChan( C, I, o ) {

	for(var c=0;c<C.length;c++) {
		var g=C[c];
		I[o.i++] = g.data;
		I[o.i++] = g.ready;
		I[o.i++] = g.irq;
		I[o.i++] = g.rdwr;
	}
}

function rdImgChan(C, I, a) {
	var n=0;
	for(var c=0;c<C.length;c++,n+=4) {
		var g=C[c];
		g.data = I[a++];
		g.ready = I[a++];
		g.irq = I[a++];
		g.rdwr = I[a++];
	}
	return n;
}

/* Load from .uknc file */

/*void*/ this.LoadFromImage = function (/*uint8_t[] */ I8, spc)
{
	var I = [];

	if(spc==1) {			// .uknc_ is without default ROM 32kb, no need to hold everything
		var j=0;
		while(j<512) I[j]=I8[j++];
		I = I.concat( UkncROM );
		var k=j+7; j+=UkncROM.length;	// 7 bytes "UKNCROM" is a marker in that position
		while(k<I8.length) I[j++]=I8[k++];
		}
	else
		{
		for(var t in I8) I[t] = I8[t];		// a simple one-time convert from Uint8array
		}


	var k,o;
    // Board data                                       // Offset Size
    var i=32;									// skip header 32 bytes
	
    Timer.Tick = N16(I[i++],I[i++]);			//   32     2
    Timer.reload = N16(I[i++],I[i++]);		//   34     2
    Timer.flags = N16(I[i++],I[i++]);		//   36     2
    Timer.divider = N16(I[i++],I[i++]);		//   38     2
												//   40    40
	i += rdImgChan( Chan.Cpu.Tx, I, i );
	i += rdImgChan( Chan.Cpu.Rx, I, i );

	i += rdImgChan( Chan.Ppu.Tx, I, i );
	i += rdImgChan( Chan.Ppu.Rx, I, i );
												//	80    --
	
    chan0disabled = I[i++];						//   80     1
    irq_cpureset = I[i++];						//   81     1
    i++;                                     	//   82     1  // not used
    scanned_key = I[i++];						//   83     1
												//  84    32
	for(k=0;k<16;k++) {
		o = kbd_matrix[k];
		o.processed = I[i++];
		o.row_Y = I[i++];
		}
												//  116    --

    multiply = N16(I[i++],I[i++]);				//  116     2
	
	for(k=0;k<6;k++) {
		freq.per[k] = N16(I[i++],I[i++]);		//  118    12
		}
	for(k=0;k<6;k++) {
		freq.out[k] = N16(I[i++],I[i++]);		//  130    12
		}
	for(k=0;k<6;k++) {
		freq.enable[k] = N16(I[i++],I[i++]);	//  142    12
		}
		
    // Cpu status
    Cpu.LoadFromImage(I.slice(160,224));				//  160    32
	
    // Ppu status
    Ppu.LoadFromImage(I.slice(224,288));				//  224    32
	
    // Cpu memory/IO controller status
    Cpu.MC.LoadFromImage(I.slice(288,352));			//  288    64
	
    // Ppu memory/IO controller status
    Ppu.MC.LoadFromImage(I.slice(352,416));			//  352    64

    // ROM
    ROM = I.slice(512, 33280);
    // RAM planes 0, 1, 2
    RAM[0] = I.slice(33280, 98816);				//65536
    RAM[1] = I.slice(98816, 164352);			//65536
    RAM[2] = I.slice(164352, 229888);			//65536

}

 // Additional SAV, GME file loader, works but not always for sure.
 // Mostly copies memory blocks and takes time to load other parts from the disk.
 // So, for small games only.

 this.LoadSAV = function (/*uint8_t[] */ I) {
	
	var i=32;										// offset
	var start = ADDRESS( N16(I[i++],I[i++]) );		// 32 - Address to load
	var stack = ADDRESS( N16(I[i++],I[i++]) );		// 34 - Address of stack
	i+=4;
	var ending = ADDRESS( N16(I[i++],I[i++]) );		// 40 - The ending address of program
	
	i=320;	// 000500 address where the program code begins,
			// mostly it is a loader of the second part
	while(i<I.length && i<ending) {
		var o=i>>>1;
		RAM[1][o] = I[i++];
		RAM[2][o] = I[i++]
		}
	
	Cpu.setReg(7,start);
	Cpu.setReg(6,stack);

 }

 return this;

}
