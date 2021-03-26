

var UKNC_SCREEN = { WIDTH:640, HEIGHT:288 };

var /*uint16*/ SEL_REGISTER = 57344; /*0160000*/ // GetSelRegister()

function INTERRUPT(n) { return parseInt(n,8); }
function ASSERT(l, t) { if(!l) console.log("ASSERT" + (t?t:"")); }
function LOG(s) { console.log(s); }

function MAKEWORD(a,b) {
	return ( ((b<<8)|a)&0xFFFF )>>>0;
}

function MAKELONG(a,b) {
	return ( ((b<<16)|a)&0xFFFFFFFF )>>>0;
}

function N16(a,b) { return a|(b<<8); }

function Nlo(a) { return a&255; }

function Nhi(a) { return (a>>>8)&255; }


// Process Status Word (PSW) bits
var PSW = {
	C:1,      // Carry
	V:2,      // Arithmetic overflow
	Z:4,      // Zero result
	N:8,      // Negative result
	T:16,     // Trap/Debug
	P:128,		/*0200*/    // Priority
	HALT:256	/*0400*/    // Halt
}

// Commands -- no operands
var PI = {};
PI.HALT =        0; /*0000000*/ 
PI.WAIT =        1; /*0000001*/ 
PI.RTI =         2; /*0000002*/ 
PI.BPT =         3; /*0000003*/ 
PI.IOT =         4; /*0000004*/ 
PI.RESET =       5; /*0000005*/ 
PI.RTT =         6; /*0000006*/ 
PI.MFPT	=        7; /*0000007*/ 
PI.HALT10 =      8; /*0000010*/ 
PI.HALT11 =      9; /*0000011*/ 
PI.HALT12 =      10; /*0000012*/ 
PI.HALT13 =      11; /*0000013*/ 
PI.HALT14 =      12; /*0000014*/ 
PI.HALT15 =      13; /*0000015*/ 
PI.HALT16 =      14; /*0000016*/ 
PI.HALT17 =      15; /*0000017*/ 
PI.NOP =         160; /*0000240*/ 
PI.CLC =         161; /*0000241*/ 
PI.CLV =         162; /*0000242*/ 
PI.CLVC =        163; /*0000243*/ 
PI.CLZ =         164; /*0000244*/ 
PI.CLZC =        165; /*0000245*/ 
PI.CLZV =        166; /*0000246*/ 
PI.CLZVC =       167; /*0000247*/ 
PI.CLN =         168; /*0000250*/ 
PI.CLNC =        169; /*0000251*/ 
PI.CLNV =        170; /*0000252*/ 
PI.CLNVC =       171; /*0000253*/ 
PI.CLNZ =        172; /*0000254*/ 
PI.CLNZC =       173; /*0000255*/ 
PI.CLNZV =       174; /*0000256*/ 
PI.CCC =         175; /*0000257*/ 
PI.NOP260 =      176; /*0000260*/ 
PI.SEC =         177; /*0000261*/ 
PI.SEV =         178; /*0000262*/ 
PI.SEVC =        179; /*0000263*/ 
PI.SEZ =         180; /*0000264*/ 
PI.SEZC =        181; /*0000265*/ 
PI.SEZV =        182; /*0000266*/ 
PI.SEZVC =       183; /*0000267*/ 
PI.SEN =         184; /*0000270*/ 
PI.SENC =        185; /*0000271*/ 
PI.SENV =        186; /*0000272*/ 
PI.SENVC =       187; /*0000273*/ 
PI.SENZ =        188; /*0000274*/ 
PI.SENZC =       189; /*0000275*/ 
PI.SENZV =       190; /*0000276*/ 
PI.SCC =         191; /*0000277*/ 
PI.MED =        32128; /*0076600*/ 

// Commands -- single operand
PI.RTS =         128; /*0000200*/ 

// Commands -- two operands
PI.JMP =         64; /*0000100*/ 
PI.SWAB =        192; /*0000300*/ 
PI.CLR =         2560; /*0005000*/ 
PI.COM =         2624; /*0005100*/ 
PI.INC =         2688; /*0005200*/ 
PI.DEC =         2752; /*0005300*/ 
PI.NEG =         2816; /*0005400*/ 
PI.ADC =         2880; /*0005500*/ 
PI.SBC =         2944; /*0005600*/ 
PI.TST =         3008; /*0005700*/ 
PI.ROR =         3072; /*0006000*/ 
PI.ROL =         3136; /*0006100*/ 
PI.ASR =         3200; /*0006200*/ 
PI.ASL =         3264; /*0006300*/ 
PI.MARK =        3328; /*0006400*/ 
PI.SXT =         3520; /*0006700*/ 
PI.MTPS =        36096; /*0106400*/ 
PI.MFPS =        36288; /*0106700*/ 

// Commands -- branchs
PI.BR =          256; /*0000400*/ 
PI.BNE =         512; /*0001000*/ 
PI.BEQ =         768; /*0001400*/ 
PI.BGE =         1024; /*0002000*/ 
PI.BLT =         1280; /*0002400*/ 
PI.BGT =         1536; /*0003000*/ 
PI.BLE =         1792; /*0003400*/ 
PI.BPL =         32768; /*0100000*/ 
PI.BMI =         33024; /*0100400*/ 
PI.BHI =         33280; /*0101000*/ 
PI.BLOS =        33536; /*0101400*/ 
PI.BVC =         33792; /*0102000*/ 
PI.BVS =         34048; /*0102400*/ 
PI.BHIS =        34304; /*0103000*/ 
PI.BLO =         34560; /*0103400*/ 

PI.EMT =         34816; /*0104000*/ 
PI.TRAP =        35072; /*0104400*/ 

// Commands -- three operands
PI.JSR =         2048; /*0004000*/ 
PI.MUL =         28672; /*0070000*/ 
PI.DIV =         29184; /*0071000*/ 
PI.ASH =         29696; /*0072000*/ 
PI.ASHC =        30208; /*0073000*/ 
PI.XOR =         30720; /*0074000*/ 
PI.SOB =         32256; /*0077000*/ 

// Commands -- four operands
PI.MOV =         4096; /*0010000*/ 
PI.CMP =         8192; /*0020000*/ 
PI.BIT =         12288; /*0030000*/ 
PI.BIC =         16384; /*0040000*/ 
PI.BIS =         20480; /*0050000*/ 

PI.ADD =         24576; /*0060000*/ 
PI.SUB =         57344; /*0160000*/ 

// Commands -- VM2 specifics
PI.MUL =         28672; /*0070000*/ 
PI.DIV =         29184; /*0071000*/ 
PI.ASH =         29696; /*0072000*/ 
PI.ASHC =        30208; /*0073000*/ 
PI.FADD =        31232; /*0075000*/ 
PI.FSUB =        31240; /*0075010*/ 
PI.FMUL =        31248; /*0075020*/ 
PI.FDIV =        31256; /*0075030*/ 

// Commands -- special commands, HALT mode only
PI.START =       10; /*0000012*/   // Return to USER mode;  PC := CPC; PSW := CPS
PI.STEP =        14; /*0000016*/ 
PI.RSEL =        16; /*0000020*/   // R0 := SEL  - Read SEL register
PI.MFUS =        17; /*0000021*/   // R0 := (R5)+
PI.RCPC =        18; /*0000022*/   // R0 := CPC
PI.RCPS =        20; /*0000024*/   // R0 := CPS
PI.MTUS =        25; /*0000031*/   // -(R5) := R0
PI.WCPC =        26; /*0000032*/   // CPC := R0
PI.WCPS =        28; /*0000034*/   // CPS := R0

var ADDRTYPE = {
	RAM0: 0,   // RAM plane 0
	RAM1: 1,   // RAM plane 1
	RAM2: 2,    // RAM plane 2
	RAM12: 4,    // RAM plane 1 & 2 - a special case for CPU memory
	ROM: 32,   // ROM
	ROMCART1: 40,  // ADDRTYPE.ROM + 8  -- ROM cartridge #1
	ROMCART2: 48,  // ADDRTYPE.ROM + 16 -- ROM cartridge #2
	IO:    64,   // I/O port; bits 5..0 -- device number
	NONE:  128,  // No data
	DENY:  255,  // Access denied
	MASK_RAM:  7,  // Mask to get memory plane number
	RAM_PPU: 99  // This is for PPU memory (mostly RAM0, like combined RAM12 for CPU) to see in Dbg view
};

// Floppy debug constants

var FLOPPY = {

	FSM: {
		IDLE:0,
		WAITFOR:{
			LSB:0,
			MSB:1,
			TERM1:2,
			TERM2:3
			}
		},
	STATUS: {
		TRACK0:1,				//  Track 0 flag
		RDY:2,					// Ready status
		WRITEPROTECT:4,			// Write protect
		MOREDATA:128, /*0200*/	// Need more data flag
		CHECKSUMOK:16384, /*040000*/	// Checksum verified OK
		INDEXMARK:32768 /*0100000*/		// Index flag, indicates the beginning of track
		},
	CMD: {
		CORRECTION250:4,
		CORRECTION500:8, /*010*/
		ENGINESTART:16, /*020*/		//	Engine on/off
		SIDEUP:32, /*040*/			//	Side: 1 -- upper head, 0 -- lower head
		DIR:64, /*0100*/			//	Direction: 0 -- to center (towards trk0), 1 -- from center (towards trk80)
		STEP:128, /*0200*/			//	Step / ready
		SEARCHSYNC:256, /*0400*/	//	Search sync
		SKIPSYNC:512, /*01000*/		//	Skip sync
		MASKSTORED:636				//	CORRECTION250|CORRECTION500|SIDEUP|DIR|SKIPSYNC|ENGINESTART
		},
	RAWTRACKSIZE: 6250,		// Raw track size, bytes
	RAWMARKERSIZE: 3125,		//( RAWTRACKSIZE / 2)
	INDEXLENGTH: 150			// Length of index hole, in bytes of raw track image
};

// Emulator image constants
var UKNCIMAGE = {
	HEADER_SIZE:512,
	SIZE: (512 /*HEADER_SIZE*/ +  (32 + 64 * 3) * 1024),
	HEADER1: 0x434E4B55,  // "UKNC"
	HEADER2: 0x214C5442,  // "BTL!"
	VERSION: 0x10001  // 1.1
};

var KEYB = {
	RUS: 0x1,
	LAT: 0x2,
	LOWERREG: 0x10
};

function OCT(n) {
	return ("000000" +n.toString(8)).substr(-6);
}

function HEX(n) {
	return ("0000" +n.toString(16)).substr(-4);
}

function BIN(n) {
	return ("0000000000000000" +n.toString(2)).substr(-16);
}

function GetDigit(/*uint16_t*/ word, /*int*/ pos)
{
    return ((word >> (pos*3)) & 7);
}

var getDigit = [];				// prepared array of GetDigit(word,position) values (works faster)

function init_GetDigit() {
		// prepare getDigit values
	for(var i=0;i<0x10000;i++) {
		getDigit[i] = [];
		for(var d=0;d<6;d++) {
			getDigit[i][d] = GetDigit(i,d);
			}
		}
}
init_GetDigit();	// call it now

function ADDRESS(n) {
	return ((n&0xFFFF)>>>0);
}

// same as C, set A[0..N-1]=V
function memset( A, V, N ) {
	for(var a=0;a<N;) A[a++]=V;
	return A;
}

// same as C, set A[0..N-1]=B[0..N-1]
function memcpy( A, B, N ) {
	for(var a=0;a<N;a++) A[a]=B[a];
	return A;
}


// add value to Uint8array I8
function waddI8 ( I8, o, value ) {
	I8[o.i++]=(value&255);
	I8[o.i++]=((value>>>8)&255);
}


// Bus devices

var BusDevices = {

	ProcessorTimer: {
		Name: "Processor timer",
		/*uint16_t*/ AddressRanges: //ProcessorTimerAddressRanges
		[
		65480 /*0177710*/ , 6,  // 177710-177715
		0, 0
		]
	},

	CpuChannels : {
		Name: "Cpu-Ppu channels",
		/*uint16_t*/ AddressRanges: //CpuChannelsAddressRanges
		[
		64944 /*0176660*/ , 16,
		65392 /*0177560*/ , 8,
		0, 0
		]
	},
	
	PpuChannels : {
		Name: "Cpu-Ppu channels",
		/*uint16_t*/ AddressRanges: //PpuChannelsAddressRanges
		[
		65072 /*0177060*/ , 16,
		65088 /*0177100*/ , 4,
		0, 0
		]
	},

	NetworkAdapter : {
		Name: "Network adapter",
		/*uint16_t*/ AddressRanges: //NetworkAdapterAddressRanges
		[
		64880 /*0176560*/ , 8,
		0, 0
		]
	},
	
	SerialPort : {
		Name: "Serial port",
		/*uint16_t*/ AddressRanges: //SerialPortAddressRanges
		[
		64888 /*0176570*/ , 8,
		0, 0
		]
	},

	CpuMemoryAccess : {
		Name: "Memory access",
		/*uint16_t*/ AddressRanges: //CpuMemoryAccessAddressRanges
		[
		64928 /*0176640*/ , 8,
		64884 /*0176564*/ , 4,  // Remote (puljtovoj otladchik) terminal register
		0, 0
		]
	},

	PpuMemoryAccess : {
		Name: "Memory access",
		/*uint16_t*/ AddressRanges: //PpuMemoryAccessAddressRanges
		[
		65032 /*0177010*/ , 16,
		65068 /*0177054*/ , 2,
		0, 0
		]
	},

	ProgrammablePort : {
		Name: "Programmable port",
		/*uint16_t*/ AddressRanges: //ProgrammablePortAddressRanges
		[
		65088 /*0177100*/ , 4,  // i8255 ports
		0, 0
		]
	},
	
	Keyboard : {
		Name: "Keyboard",
		/*uint16_t*/ AddressRanges: //KeyboardAddressRanges
		[
		65472 /*0177700*/ , 6,
		0, 0
		]
	},
	
	FloppyController : {
		Name: "Floppy controller",
		/*uint16_t*/ AddressRanges: //FloppyControllerAddressRanges
		[
		65112 /*0177130*/ , 4,
		0, 0
		]
	},

	HardDrive : {
		Name: "Hard drive",
		/*uint16_t*/ AddressRanges: //HardDriveAddressRanges
		[
		36864 /*0110000*/ , 4096 /*010000*/,
		0, 0
		]
	}
};



