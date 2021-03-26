/*
	K1801VM2 16-bit processor JS emulation
	(PDP-11)
	Elektronika MC 0511 UKNC 1987
	UKNCBTL C-source port to JS
*/

K1801VM2 = function(/*string*/ name) {

var self = this; 

this.name = name;          // Processor name
this.isCpu = (name=="CPU");
this.bp = 0;		// can set breakpoint for debugger 

// Processor state
/*uint16_t*/ this.Tick = 0;     // How many ticks waiting to the end of current instruction, global
var /*uint16_t*/psw;              // Processor Status Word (PSW)
var /*uint16_t*/R=[];           // 8 Registers (R0..R5, R6=SP, R7=PC)
var /*uint16_t*/savepc;           // CPC register
var /*uint16_t*/savepsw;          // CPSW register

/*bool*/ this.Stopped = false;          // "Processor stopped" flag

var /*bool*/stepmode;          // Read true if it's step mode
var /*bool*/buserror;          // Read true if occurred bus error for implementing double bus error if needed
var /*bool*/haltpin;          // HALT pin
var /*bool*/DCLOpin;          // DCLO pin
var /*bool*/ACLOpin;          // ACLO pin
var /*bool*/waitmode;          // WAIT

// Current instruction processing (method)
var /*uint16_t*/instr;          // Current instruction
var /*uint8_t*/regsrc;          // Source register number
var /*uint8_t*/msrc;          // Source address mode
var /*uint16_t*/addrsrc;          // Source address
var /*uint8_t*/regdest;          // Destination register number
var /*uint8_t*/mdest;          // Destination address mode
var /*uint16_t*/addrdest;          // Destination address

// Interrupt processing
var /*bool*/STRTrq;          // Start interrupt pending
var /*bool*/RPLYrq;          // Hangup interrupt pending
var /*bool*/ILLGrq;          // Illegal instruction interrupt pending
var /*bool*/RSVDrq;          // Reserved instruction interrupt pending
var /*bool*/TBITrq;          // T-bit interrupt pending
var /*bool*/ACLOrq;          // Power down interrupt pending
var /*bool*/HALTrq;          // HALT command or HALT signal
var /*bool*/EVNTrq;          // Timer event interrupt pending
var /*bool*/FIS_rq;          // FIS command interrupt pending
var /*bool*/BPT_rq;          // BPT command interrupt pending
var /*bool*/IOT_rq;          // IOT command interrupt pending
var /*bool*/EMT_rq;          // EMT command interrupt pending
var /*bool*/TRAPrq;          // TRAP command interrupt pending


var /*uint16_t*/virq=[];          // 16 VIRQ vectors
var /*bool*/ACLOreset;          // Power fail interrupt request reset
var  /*bool*/EVNTreset;          // EVNT interrupt request reset;
var /*uint8_t*/VIRQreset;          // VIRQ request reset for given device

// Timings //

var /*uint16_t*/ MOVtk/*[8][8]*/ =
[
    [0xB, 0x22, 0x22, 0x33, 0x22, 0x37, 0x33, 0x43],
    [0x20, 0x31, 0x37, 0x43, 0x3B, 0x47, 0x43, 0x54],
    [0x20, 0x37, 0x37, 0x43, 0x3B, 0x47, 0x43, 0x53],
    [0x25, 0x43, 0x43, 0x4F, 0x47, 0x54, 0x4F, 0x60],
    [0x20, 0x37, 0x37, 0x43, 0x3B, 0x47, 0x43, 0x53],
    [0x25, 0x43, 0x43, 0x4F, 0x47, 0x54, 0x4F, 0x60],
    [0x29, 0x39, 0x3F, 0x4C, 0x3F, 0x4C, 0x4B, 0x5C],
    [0x35, 0x45, 0x4C, 0x57, 0x4C, 0x57, 0x57, 0x68]
];

var /*uint16_t*/ MOVBtk/*[8][8]*/ =
[
    [0xB, 0x25, 0x2B, 0x37, 0x2F, 0x3B, 0x3B, 0x47],
    [0x18, 0x35, 0x3B, 0x47, 0x3F, 0x4C, 0x4B, 0x57],
    [0x19, 0x3B, 0x3B, 0x47, 0x40, 0x4B, 0x4C, 0x57],
    [0x25, 0x47, 0x47, 0x54, 0x4B, 0x57, 0x57, 0x63],
    [0x19, 0x3B, 0x3B, 0x47, 0x40, 0x4B, 0x4C, 0x57],
    [0x25, 0x47, 0x47, 0x54, 0x4B, 0x57, 0x57, 0x63],
    [0x29, 0x3D, 0x43, 0x4F, 0x43, 0x4F, 0x54, 0x5F],
    [0x35, 0x49, 0x4F, 0x5B, 0x4F, 0x5B, 0x5F, 0x6C]
];

var /*uint16_t*/ CMPtk/*[8][8]*/ =
[
    [0xB, 0x1C, 0x1D, 0x29, 0x21, 0x2D, 0x35, 0x41],
    [0x18, 0x2D, 0x2D, 0x39, 0x31, 0x3D, 0x45, 0x51],
    [0x19, 0x2D, 0x2D, 0x39, 0x31, 0x3D, 0x45, 0x51],
    [0x25, 0x39, 0x39, 0x45, 0x3D, 0x49, 0x51, 0x5E],
    [0x19, 0x2D, 0x2D, 0x39, 0x31, 0x3D, 0x45, 0x51],
    [0x25, 0x39, 0x39, 0x45, 0x3D, 0x49, 0x51, 0x5E],
    [0x29, 0x35, 0x35, 0x41, 0x35, 0x41, 0x4D, 0x5A],
    [0x35, 0x41, 0x41, 0x4E, 0x41, 0x4E, 0x5A, 0x65]
];

var /*uint16_t*/ CLRtk = [0xB, 0x1C, 0x23, 0x2F, 0x23, 0x2F, 0x2F, 0x3F];

var /*uint16_t*/ TSTtk = [0xB, 0x18, 0x19, 0x25, 0x19, 0x25, 0x31, 0x3D];

var /*uint16_t*/ MTPStk = [0x18, 0x29, 0x29, 0x35, 0x29, 0x35, 0x41, 0x4D];

var /*uint16_t*/ XORtk = [0xB, 0x25, 0x2B, 0x37, 0x2F, 0x3B, 0x3B, 0x47];

var /*uint16_t*/ ASHtk = [0x29, 0x3D, 0x3D, 0x49, 0x41, 0x4D, 0x55, 0x62];
var /*uint16_t*/ ASH_Stk = 0x8;

var /*uint16_t*/ ASHCtk = [ 0x39, 0x4E, 0x4D, 0x5A, 0x51, 0x5D, 0x66, 0x72];
var /*uint16_t*/ ASHC_Stk = 0x8;

var /*uint16_t*/ MULtk = [0x60, 0xC7, 0xC7, 0xD4, 0xCA, 0xD8, 0xE1, 0xEC];

var /*uint16_t*/ DIVtk = [0x80, 0xE8, 0xE7, 0xF4, 0xEB, 0xF8, 0x100, 0x10D];

var /*uint16_t*/ JMPtk = [0x2D, 0x2D, 0x3D, 0x2D, 0x3D, 0x31, 0x41];
var /*uint16_t*/ JSRtk = [0x45, 0x45, 0x56, 0x45, 0x56, 0x49, 0x59];

var /*uint16_t*/ BRANCH_TRUEtk = 0x25;
var /*uint16_t*/ BRANCH_FALSEtk = 0x10;
var /*uint16_t*/ BPTtk = 0x94;
var /*uint16_t*/ EMTtk = 0x9C;
var /*uint16_t*/ RTItk = 0x59;
var /*uint16_t*/ RTStk = 0x31;
var /*uint16_t*/ NOPtk = 0x10;
var /*uint16_t*/ SOBtk = 0x2D;
var /*uint16_t*/ SOB_LASTtk = 0x19; //last iteration of SOB
var /*uint16_t*/ BRtk = 0x25;
var /*uint16_t*/ MARKtk = 0x41;
var /*uint16_t*/ RESETtk = 105 + 968;  // K1801VM2 technical doc. page 134

var MethodMap = [];

this.MC = {};		// memory controller

// Register control

function /*void*/ SetLPSW(/*uint8_t*/ b)
{
    psw = ((psw & 0xFF00) | (b&255))>>>0;
    if ((psw & 384) != 384) savepsw = psw;	//svpsw();
}

function /*void*/ SetReg(r, /*uint16_t*/ W)	// Set register value
{
	var w=(W & 0xFFFF)>>>0;
    R[r] = w;
    if ((r == 7) && ((psw & 384) != 384)) savepc = w;
}

function /*void*/ SetLReg(r, /*uint8_t*/ b)
{
    R[r] = ((R[r] & 0xFF00) | (b&255))>>>0;
    if ((r == 7) && ((psw & 384) != 384)) savepc = R[7];
}

/*
// These not used, only informative

SetPC(W) // Set the processor command pointer to
{
 R[7] = (W&0xFFFF)>>>0;
 if ((psw & 384) != 384) savepc = R[7];
}

SetPSW(W) // Set the processor status word register value
{
 psw = (W & 0x1FF)>>>0;
 if ((psw & 384) != 384) savepsw = psw;
}

 SetSP(W) { R[6] = (W&0xFFFF)>>>0; }
 SetCPC(W) { savepc = (W&0xFFFF)>>>0; }
 GetLReg(r) { return (R[r] & 255)>>>0; }
 SetCPSW(W) { savepsw = (W & 0xFFFF)>>>0; }
*/

// PSW bits control - implementation

function /*void*/ SetC(/*bool*/f)
{
    psw = ( f ? (psw | PSW.C) : (psw & (~PSW.C)) )>>>0;
    if ((psw & 384) != 384) savepsw = psw;	//svpsw();
}


function /*void*/ SetV(/*bool*/f)
{
    psw = ( f ? (psw | PSW.V) : (psw & (~PSW.V)) )>>>0;
    if ((psw & 384) != 384) savepsw = psw;	//svpsw();
}

function /*void*/ SetN(/*bool*/f)
{
    psw = ( f ? (psw | PSW.N) : (psw & (~PSW.N)) )>>>0;
    if ((psw & 384) != 384) savepsw = psw;	//svpsw();
}

function /*void*/ SetZ(/*bool*/f)
{
    psw = ( f ? (psw | PSW.Z) : (psw & (~PSW.Z)) )>>>0;
    if ((psw & 384) != 384) savepsw = psw;	//svpsw();
}


// Processor state
function /*void*/ SetHALT(/*bool*/f)
{
    psw = ( f ? (psw | PSW.HALT) : (psw & (~PSW.HALT)) )>>>0;
}

    // HALT flag (true - HALT mode, false - USER mode)
/*bool*/ this.Halted = function() { return (psw & PSW.HALT); }

// Processor control

/*void*/ this.VIRQ = function(/*int*/ que, /*uint16_t*/ irq)
{
    if (self.Stopped) return;  // Processor is stopped - nothing to do
    virq[que] = irq;
}

// each operation is a function call
function OpC(/*uint16_t*/ opstart, /*uint16_t*/ opend, /*MethodRef*/ methodref)
	{
	for (var /*uint32_t*/i=opstart; i<= opend; i++) MethodMap[i] = methodref;
	}

// for global access
this.getReg = function(i) { return R[i]; }
this.setReg = function(i,v) { SetReg(i,v); }
this.getSP = function(i,v) { return R[6]; }
this.getPC = function(i,v) { return R[7]; }
this.getPSW = function(i) { return psw; }
this.getCPC = function(i) { return savepc; }
this.getCPSW = function(i) { return savepsw; }
this.getVIRQ = function(i) { return virq[i]; }

function /*void*/ init()
{
    OpC( 0 /*0000000*/ , 65535 /*0177777*/ , UNKNOWN );		// TRAP 10

    OpC( 0 /*0000000*/ , 0 /*0000000*/ , HALT );
    OpC( 1 /*0000001*/ , 1 /*0000001*/ , WAIT );
    OpC( 2 /*0000002*/ , 2 /*0000002*/ , RTI );
    OpC( 3 /*0000003*/ , 3 /*0000003*/ , BPT );
    OpC( 4 /*0000004*/ , 4 /*0000004*/ , IOT );
    OpC( 5 /*0000005*/ , 5 /*0000005*/ , RESET );
    OpC( 6 /*0000006*/ , 6 /*0000006*/ , RTT );

    OpC( 8 /*0000010*/ , 11 /*0000013*/ , RUN );
    OpC( 12 /*0000014*/ , 15 /*0000017*/ , STEP );
    OpC( 16 /*0000020*/ , 16 /*0000020*/ , RSEL );
    OpC( 17 /*0000021*/ , 17 /*0000021*/ , MFUS );
    OpC( 18 /*0000022*/ , 19 /*0000023*/ , RCPC );
    OpC( 20 /*0000024*/ , 23 /*0000027*/ , RCPS );
    OpC( 24 /*0000030*/ , 24 /*0000030*/ , fc000030 );
    OpC( 25 /*0000031*/ , 25 /*0000031*/ , MTUS );
    OpC( 26 /*0000032*/ , 27 /*0000033*/ , WCPC );
    OpC( 28 /*0000034*/ , 31 /*0000037*/ , WCPS );

    OpC( 64 /*0000100*/ , 127 /*0000177*/ , JMP );
    OpC( 128 /*0000200*/ , 135 /*0000207*/ , RTS );  // RTS - RETURN

    OpC( 160 /*0000240*/ , 175 /*0000257*/ , CCC );

    OpC( 176 /*0000260*/ , 191 /*0000277*/ , SCC );

    OpC( 192 /*0000300*/ , 255 /*0000377*/ , SWAB );

    OpC( 256 /*0000400*/ , 511 /*0000777*/ , BR );
    OpC( 512 /*0001000*/ , 767 /*0001377*/ , BNE );
    OpC( 768 /*0001400*/ , 1023 /*0001777*/ , BEQ );
    OpC( 1024 /*0002000*/ , 1279 /*0002377*/ , BGE );
    OpC( 1280 /*0002400*/ , 1535 /*0002777*/ , BLT );
    OpC( 1536 /*0003000*/ , 1791 /*0003377*/ , BGT );
    OpC( 1792 /*0003400*/ , 2047 /*0003777*/ , BLE );

    OpC( 2048 /*0004000*/ , 2559 /*0004777*/ , JSR );  // JSR - CALL

    OpC( 2560 /*0005000*/ , 2623 /*0005077*/ , CLR );
    OpC( 2624 /*0005100*/ , 2687 /*0005177*/ , COM );
    OpC( 2688 /*0005200*/ , 2751 /*0005277*/ , INC );
    OpC( 2752 /*0005300*/ , 2815 /*0005377*/ , DEC );
    OpC( 2816 /*0005400*/ , 2879 /*0005477*/ , NEG );
    OpC( 2880 /*0005500*/ , 2943 /*0005577*/ , ADC );
    OpC( 2944 /*0005600*/ , 3007 /*0005677*/ , SBC );
    OpC( 3008 /*0005700*/ , 3071 /*0005777*/ , TST );
    OpC( 3072 /*0006000*/ , 3135 /*0006077*/ , ROR );
    OpC( 3136 /*0006100*/ , 3199 /*0006177*/ , ROL );
    OpC( 3200 /*0006200*/ , 3263 /*0006277*/ , ASR );
    OpC( 3264 /*0006300*/ , 3327 /*0006377*/ , ASL );

    OpC( 3328 /*0006400*/ , 3391 /*0006477*/ , MARK );
    OpC( 3520 /*0006700*/ , 3583 /*0006777*/ , SXT );

    OpC( 4096 /*0010000*/ , 8191 /*0017777*/ , MOV );
    OpC( 8192 /*0020000*/ , 12287 /*0027777*/ , CMP );
    OpC( 12288 /*0030000*/ , 16383 /*0037777*/ , BIT );
    OpC( 16384 /*0040000*/ , 20479 /*0047777*/ , BIC );
    OpC( 20480 /*0050000*/ , 24575 /*0057777*/ , BIS );
    OpC( 24576 /*0060000*/ , 28671 /*0067777*/ , ADD );

    OpC( 28672 /*0070000*/ , 29183 /*0070777*/ , MUL );
    OpC( 29184 /*0071000*/ , 29695 /*0071777*/ , DIV );
    OpC( 29696 /*0072000*/ , 30207 /*0072777*/ , ASH );
    OpC( 30208 /*0073000*/ , 30719 /*0073777*/ , ASHC );
    OpC( 30720 /*0074000*/ , 31231 /*0074777*/ , XOR );
    OpC( 31232 /*0075000*/ , 31263 /*0075037*/ , FIS );
    OpC( 32256 /*0077000*/ , 32767 /*0077777*/ , SOB );

    OpC( 32768 /*0100000*/ , 33023 /*0100377*/ , BPL );
    OpC( 33024 /*0100400*/ , 33279 /*0100777*/ , BMI );
    OpC( 33280 /*0101000*/ , 33535 /*0101377*/ , BHI );
    OpC( 33536 /*0101400*/ , 33791 /*0101777*/ , BLOS );
    OpC( 33792 /*0102000*/ , 34047 /*0102377*/ , BVC );
    OpC( 34048 /*0102400*/ , 34303 /*0102777*/ , BVS );
    OpC( 34304 /*0103000*/ , 34559 /*0103377*/ , BHIS );  // BCC
    OpC( 34560 /*0103400*/ , 34815 /*0103777*/ , BLO );   // BCS

    OpC( 34816 /*0104000*/ , 35071 /*0104377*/ , EMT );
    OpC( 35072 /*0104400*/ , 35327 /*0104777*/ , TRAP );

    OpC( 35328 /*0105000*/ , 35391 /*0105077*/ , CLRB );
    OpC( 35392 /*0105100*/ , 35455 /*0105177*/ , COMB );
    OpC( 35456 /*0105200*/ , 35519 /*0105277*/ , INCB );
    OpC( 35520 /*0105300*/ , 35583 /*0105377*/ , DECB );
    OpC( 35584 /*0105400*/ , 35647 /*0105477*/ , NEGB );
    OpC( 35648 /*0105500*/ , 35711 /*0105577*/ , ADCB );
    OpC( 35712 /*0105600*/ , 35775 /*0105677*/ , SBCB );
    OpC( 35776 /*0105700*/ , 35839 /*0105777*/ , TSTB );
    OpC( 35840 /*0106000*/ , 35903 /*0106077*/ , RORB );
    OpC( 35904 /*0106100*/ , 35967 /*0106177*/ , ROLB );
    OpC( 35968 /*0106200*/ , 36031 /*0106277*/ , ASRB );
    OpC( 36032 /*0106300*/ , 36095 /*0106377*/ , ASLB );

    OpC( 36096 /*0106400*/ , 36159 /*0106477*/ , MTPS );
    OpC( 36288 /*0106700*/ , 36351 /*0106777*/ , MFPS );

    OpC( 36864 /*0110000*/ , 40959 /*0117777*/ , MOVB );
    OpC( 40960 /*0120000*/ , 45055 /*0127777*/ , CMPB );
    OpC( 45056 /*0130000*/ , 49151 /*0137777*/ , BITB );
    OpC( 49152 /*0140000*/ , 53247 /*0147777*/ , BICB );
    OpC( 53248 /*0150000*/ , 57343 /*0157777*/ , BISB );
    OpC( 57344 /*0160000*/ , 61439 /*0167777*/ , SUB );
	
}
init();		// now, loaded ready

/*void*/ this.Processor  = function()				// init2, later can be used again globally
{
    R = [0,0,0,0,0,0,0,0];
    psw = savepsw = 511; /*0777*/
    savepc = 65535; /*0177777*/
    self.Stopped = true;
    self.Tick = 0;

    waitmode = stepmode = buserror = false;
    STRTrq = RPLYrq = RSVDrq = TBITrq = ACLOrq = HALTrq = EVNTrq = false;
    ILLGrq = FIS_rq = BPT_rq = IOT_rq = EMT_rq = TRAPrq = false;
    ACLOreset = EVNTreset = false; VIRQreset = 0;
    DCLOpin = ACLOpin = true;
    haltpin = false;

    instr = regsrc = msrc = regdest = mdest = addrsrc = addrdest = 0;
    virq = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
}

// execute one operator (from Board)

/*void*/ this.Execute = function() {

    if (self.Stopped) return;  // Processor is stopped - nothing to do

    if (self.Tick > 0)			// Board loop can be optimised, Tick counter reduced, too many function calls
    {
        self.Tick--;
        return;
    }

    self.Tick = 0;  //Anything unknown will cause exception (EMT)

    if (!self.IRQ())	{
        self.CmdExe();	// Command Execution
	}
}

/*bool*/ this.IRQ = function()		// Interrupt processing
{
    var /*uint16_t*/ iv = -1;	// interrupt vector
			// Current processor mode: true = HALT mode, false = USER mode
    var /*bool*/ cm = ((psw & PSW.HALT /*0400*/ ) != 0);	// current mode
    var /*bool*/ im = false;  // interrupt mode newly, true = HALT, false = USER

    if (stepmode)
        stepmode = false;
    else
    {
        ACLOreset = EVNTreset = false; VIRQreset = 0;
        TBITrq = ((psw & 16 /*020*/ ) != 0);  // T-bit

        if (STRTrq)
        {
            iv = 0; im = true;
            STRTrq = false;
        }
        else if (HALTrq)  // HALT command
        {
            iv = 120; /*0170*/  im = true;
            HALTrq = false;
        }
        else if (BPT_rq)  // BPT command
        {
            iv = 12; /*0000014*/  im = false;
            BPT_rq = false;
        }
        else if (IOT_rq)  // IOT command
        {
            iv = 16; /*0000020*/  im = false;
            IOT_rq = false;
        }
        else if (EMT_rq)  // EMT command
        {
            iv = 24; /*0000030*/  im = false;
            EMT_rq = false;
        }
        else if (TRAPrq)  // TRAP command
        {
            iv = 28; /*0000034*/  im = false;
            TRAPrq = false;
        }
        else if (FIS_rq)  // FIS commands -- Floating point Instruction Set
        {
            iv = 8; /*0010*/  im = true;
            FIS_rq = false;
        }
        else if (RPLYrq)  // hangup, priority 1
        {
            if (buserror)
            {
                iv = 124; /*0174*/ im = true;
            }
            else if (cm)
            {
                iv = 4; /*0004*/  im = true;
            }
            else
            {
                iv = 4; /*0000004*/ im = false;
            }
            buserror = true;
            RPLYrq = false;
        }
        else if (ILLGrq)
        {
            iv = 4; /*000004*/  im = false;
            ILLGrq = false;
        }
        else if (RSVDrq)  // Reserved command, priority 2
        {
            iv = 8; /*000010*/  im = false;
            RSVDrq = false;
        }
        else if (TBITrq && (!waitmode))  // T-bit, priority 3
        {
            iv = 12; /*000014*/  im = false;
            TBITrq = false;
        }
        else if (ACLOrq && (psw & 384 /*0600*/ ) != 384 /*0600*/ )  // ACLO, (on power out), priority 4
        {
            iv = 20; /*000024*/  im = false;
            ACLOreset = true;
        }
        else if (haltpin && (psw & 256 /*0400*/ ) != 256 /*0400*/ )  // HALT signal in USER mode, priority 5
        {
            iv = 120; /*0170*/  im = true;
        }
        else if (EVNTrq && (psw & 128 /*0200*/ ) != 128 /*0200*/ )  // EVNT signal, (network timer) priority 6
        {
            iv = 64; /*0000100*/  im = false;
            EVNTreset = true;
        }
        else if ((psw & 128 /*0200*/ ) != 128 /*0200*/ )  // VIRQ, priority 7
        {
            im = false;
            if( virq.toString()!="0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0") {
			
            for (var i=1; i<=15; i++)
             {
             if (virq[i])
              {
               iv = virq[i];
               VIRQreset = i;
               break;
              }
             }
            }
        }
        if (iv>=0)
        {
            if (self.Tick == 0) self.Tick = EMTtk;  //Anything unknown will cause exception (EMT)

            waitmode = false;
			
            var /*uint16_t*/ new_pc, new_psw;

            if (im)  // HALT mode interrupt
            {
                iv |= (SEL_REGISTER & 0xFF00);
				
                // Save PC/PSW to CPC/CPSW
                //savepc = R[7];
                //savepsw = psw;
                //psw |= 256; /*0400*/
                SetHALT(true);
                new_pc = GetWord(iv);
                new_psw = GetWord(iv+2);
                if (!RPLYrq)
                {
                    psw = (new_psw & 0x1FF /*0777*/)>>>0;
                    if ((psw & 384) != 384) savepsw = psw;
	
                    R[7] = (new_pc&0xFFFF)>>>0;
                    if ((psw & 384) != 384) savepc = R[7];
					
					trace.irq(self,iv,VIRQreset);
                }
            }
            else  // USER mode interrupt
            {

                SetHALT(false);
                // Save PC/PSW to stack
                R[6] = ( (R[6] - 2) & 0xFFFF)>>>0;;
                SetWord(R[6], savepsw);
                R[6] = ( (R[6] - 2) & 0xFFFF)>>>0;;
                if (!RPLYrq)
                {
                    SetWord(R[6], savepc);
                    if (!RPLYrq)
                    {
                        if (ACLOreset) ACLOrq = false;
                        if (EVNTreset) EVNTrq = false;
                        if (VIRQreset) virq[VIRQreset] = 0;
                        new_pc = GetWord(iv);
                        new_psw = GetWord(iv+2);
                        if (!RPLYrq)
                        {
                            //SetPSW()
                            psw = ((psw & 0xFF00) | (new_psw&255))>>>0;
                            if ((psw & 384) != 384) savepsw = psw;
                            //SetPC()
                            R[7] = (new_pc&0xFFFF)>>>0;
                            if ((psw & 384) != 384) savepc = R[7];
							
							trace.irq(self,iv,VIRQreset);
                        }
                    }
                }
            }

            return true;
        }
    }
    return false;
}

/*void*/ this.CmdExe = function()			//CommandExecution
{
    if (!waitmode)
    {
        trace.instr(self);
	
        // Fetch - Read next instruction from memory
        instr = self.MC.GetWord(R[7], (psw & PSW.HALT), true);	// GetWordExec(pc)
        R[7] = ((R[7]+2)&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
	
        if (!RPLYrq)
        {
            buserror = false;
			
            // Translate - process next instruction
            var o = getDigit[instr];	// Prepare values to help decode the command
            regdest = o[0]; mdest = o[1]; regsrc = o[2]; msrc = o[3];
            MethodMap[instr]();  // Call command implementation method, using the command map
			speed.Ticks += self.Tick;		// count also to see
        }
		
		trace.ticker(self);
    }
    if (HALTrq || BPT_rq || IOT_rq || EMT_rq || TRAPrq || FIS_rq)
        self.IRQ();
}

/*void*/ this.TickEVNT = function()
{
    if (self.Stopped) return;  // Processor is stopped - nothing to do

    EVNTrq = true;
}

/*void*/ this.SetHALTPin = function(/*bool*/ value) { haltpin = value; }

/*void*/ this.SetDCLOPin = function(/*bool*/ value)
{
    DCLOpin = value;
    if (DCLOpin)
    {
        self.Stopped = true;

        stepmode = false;
        buserror = false;
        waitmode = false;
        self.Tick = 0;
        RPLYrq = RSVDrq = TBITrq = ACLOrq = HALTrq = EVNTrq = false;
        ILLGrq = FIS_rq = BPT_rq = IOT_rq = EMT_rq = TRAPrq = false;
        virq = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
        ACLOreset = EVNTreset = false; VIRQreset = 0;
        self.MC.DCLO_Signal();
        self.MC.ResetDevices();
    }
}

/*void*/ this.SetACLOPin = function(/*bool*/ value)
{
    if (self.Stopped && !DCLOpin && ACLOpin && !value)
    {
        self.Stopped = false;
        self.Tick = 0;

        stepmode = false;
        waitmode = false;
        buserror = false;
        RPLYrq = RSVDrq = TBITrq = ACLOrq = HALTrq = EVNTrq = false;
        ILLGrq = FIS_rq = BPT_rq = IOT_rq = EMT_rq = TRAPrq = false;
        virq = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
        ACLOreset = EVNTreset = false; VIRQreset = 0;

        // "Turn On" interrupt processing
        STRTrq = true;
    }
    if (!self.Stopped && !DCLOpin && !ACLOpin && value)
    {
        ACLOrq = true;
    }
    ACLOpin = value;
}

/*void*/ this.MemoryError = function(address)
{
	if(dbg.active) return;
	
	// happens when using disks, also debugging addresses, so, ignore
	// CPU goes HALT when reaching addresses 0000...
	
	//LOG( self.name + ':' + OCT(R[7]) +
	//' memory error, address ' + (address ? OCT(address) : '') +
	//', ' + (self.Halted() ? "HALT" : "USER") );
	
    RPLYrq = true;
	
}


// ----- RAM memory


// data access in addresses (via MemoryController)

function /*uint16_t*/ GetWord(/*uint16_t*/ addr) {
 return self.MC.GetWord((addr&0xFFFF)>>>0, false);
 }
 
function /*void*/ SetWord(/*uint16_t*/ addr, /*uint16_t*/ word) {
 self.MC.SetWord((addr&0xFFFF)>>>0, (word&0xFFFF)>>>0);
 }
 
function /*uint8_t*/ GetByte(/*uint16_t*/ addr) {
 return self.MC.GetByte((addr&0xFFFF)>>>0);
 }
 
function /*void*/ SetByte(/*uint16_t*/ addr, /*uint8_t*/ b) {
 self.MC.SetByte((addr&0xFFFF)>>>0, (b&255)>>>0);
}

// ----- RAM access through address

function /*uint16_t*/ GetWordAddr (/*uint8_t*/ meth, /*uint8_t*/ reg)
{
    var /*uint16_t*/ addr=0;

    switch (meth)
    {
    case 1:   //(R)
        addr = R[reg];
        break;
    case 2:   //(R)+
        addr = R[reg];
        SetReg(reg, addr+2);
        break;
    case 3:  //@(R)+
        addr = R[reg];
        SetReg(reg, addr+2);
        addr = GetWord(addr);
        break;
    case 4: //-(R)
        SetReg(reg, R[reg]-2);
        addr = R[reg];
        break;
    case 5: //@-(R)
        SetReg(reg, R[reg]-2);
        addr = R[reg];
        addr = GetWord(addr);
        break;
    case 6: //d(R)
        addr = GetWord(R[7]);
        R[7] = ((R[7] + 2)&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
        addr = R[reg] + addr;
        break;
    case 7: //@d(r)
        addr = GetWord(R[7]);
        R[7] = ((R[7] + 2)&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
        addr = R[reg] + addr;
        if (!RPLYrq) addr = GetWord(addr);
        break;
    }
    return (addr & 0xFFFF)>>>0;
}

function /*uint16_t*/ GetByteAddr (/*uint8_t*/ meth, /*uint8_t*/ reg)
{
    var /*uint16_t*/ addr = 0;

    switch (meth)
    {
    case 1:
        addr = R[reg];
        break;
    case 2:
        addr = R[reg];
        SetReg(reg, addr+(reg<6 ? 1 : 2));
        break;
    case 3:
        addr = R[reg];
        SetReg(reg, addr+2);
        addr = GetWord(addr);
        break;
    case 4:
        SetReg(reg, R[reg]-(reg<6 ? 1 : 2));
        addr = R[reg];
        break;
    case 5:
        SetReg(reg, R[reg]-2);
        addr = R[reg];
        addr = GetWord(addr);
        break;
    case 6: //d(R)
        addr = GetWord(R[7]);
        R[7] = ((R[7] + 2)&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
        addr = ((R[reg] + addr)&0xFFFF)>>>0;
        break;
    case 7: //@d(r)
        addr = GetWord(R[7]);
        R[7] = ((R[7] + 2)&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
        addr = ((R[reg] + addr)&0xFFFF)>>>0;
        if (!RPLYrq) addr = GetWord(addr);
        break;
    }

    return (addr & 0xFFFF)>>>0;
}


//---------------------------- Instructions

function /*void*/ UNKNOWN ()  // No such instruction, call TRAP 10
{
    RSVDrq = true;
}


// Instruction execution

function /*void*/ WAIT ()  // WAIT - Wait for an interrupt
{
    waitmode = true;
}

function /*void*/ STEP()  // STEP
{
    if ((psw & PSW.HALT) == 0)  // This only in HALT mode
        RSVDrq = true;
    else
    {
        R[7] = savepc;	// PC <- CPC
        psw = savepsw;	// PSW (8:0) <- CPSW(8:0)
        stepmode = true;
    }
}

function /*void*/ RSEL()  // RSEL / Read non-address register
{
    if ((psw & PSW.HALT) == 0)  // This only in HALT mode
        RSVDrq = true;
    else
    {
        SetReg(0, SEL_REGISTER);  // R0 <- (SEL)
    }
}

function /*void*/ fc000030()  // Unknown command
{
    if ((psw & PSW.HALT) == 0)  // This only in HALT mode
    {
        RSVDrq = true;
        return;
    }

    SetReg(0, 0);
    while ((R[0] & 128 /*0200*/ ) == 0 && (R[2] & 128 /*0200*/ ) == 0)
    {
        SetReg(1, R[1] << 1);
        SetReg(2, ((R[2] & 255) << 1) | ((psw & PSW.C) ? 1 : 0));
        SetReg(2, ((R[2] & 128 /*0200*/ ) ? 0xFF00 : 0) | (R[2] & 255) );
        SetReg(3, (R[3] << 1) | ((psw & PSW.C) ? 1 : 0));
        SetReg(0, R[0] + 1);
    }
    SetN(0);
    SetZ(R[0] == 0);
    SetV(0);
    SetC(0);
}

function /*void*/ FIS()  // Floating point instruction set: FADD, FSUB, FMUL, FDIV
{
    if (SEL_REGISTER & 128 /*0200*/ )  // bit 7 set?
        RSVDrq = true;  // No sub for FIS emulation, interrupt(reserved code)
    else
        FIS_rq = true;  // Interrupt FIS
}

function /*void*/ RUN()  // START
{
    if ((psw & PSW.HALT) == 0)  // This only in HALT mode
        RSVDrq = true;
    else
    {    
        R[7] = savepc;	// PC <- CPC
        psw = savepsw;	// PSW(8:0) <- CPSW(8:0)
    }
}

function /*void*/ HALT ()  // HALT
{
    HALTrq = true;
}

function /*void*/ RCPC()  // Reading processor (command position) into word copy
{
    if ((psw & PSW.HALT) == 0)  // This only in HALT mode
        RSVDrq = true;
    else
    {
        SetReg(0, savepc);        // R0 <- CPC
        self.Tick = NOPtk;
    }
}
function /*void*/ RCPS()  // Reading processor status from word copy
{
    if ((psw & PSW.HALT) == 0)  // Only in HALT mode
        RSVDrq = true;
    else
    {
        SetReg(0, savepsw);       // R0 <- CPSW
        self.Tick = NOPtk;
    }
}
function /*void*/ WCPC()  // Saving processor (command position) into word copy
{
    if ((psw & PSW.HALT) == 0)  // Only in HALT mode
        RSVDrq = true;
    else
    {
        savepc = R[0];       // CPC <- R0
        self.Tick = NOPtk;
    }
}
function /*void*/ WCPS()  // Saving processor status into word copy
{
    if ((psw & PSW.HALT) == 0)  // Only in HALT mode
        RSVDrq = true;
    else
    {
        savepsw = R[0];      // CPSW <- R0
        self.Tick = NOPtk;
    }
}

function /*void*/ MFUS ()  // Reading from memory in USER mode
{
    if ((psw & PSW.HALT) == 0)  // Only in HALT mode
    {
        RSVDrq = true;
        return;
    }

    //r0 = (r5)+
    SetHALT(false);
    var /*uint16_t*/ addr = R[5];
    var /*uint16_t*/ word = GetWord(addr);  // Read in USER mode
    SetHALT(true);
    SetReg(5, addr + 2);
    if (!RPLYrq) SetReg(0, word);

    self.Tick = MOVtk[0][2];
}

function /*void*/ MTUS()  // Writing in memory for USER mode
{
    if ((psw & PSW.HALT) == 0)  // Only in HALT mode
    {
        RSVDrq = true;
        return;
    }

    // -(r5) = r0
    SetReg(5, R[5] - 2);
    SetHALT(false);
    SetWord(R[5], R[0]);  // Write in USER mode
    SetHALT(true);

    self.Tick = MOVtk[0][2];
}

function /*void*/ RTI()  // RTI - Return from Interrupt
{
    var /*uint16_t*/ word = GetWord(R[6]);
    R[6] = ( (R[6] + 2) & 0xFFFF)>>>0;;
    if (RPLYrq) return;
    R[7] = (word&0xFFFF)>>>0;	// Pop PC
    if ((psw & 384) != 384) savepc = R[7];
    word = GetWord ( R[6] );  // Pop PSW --- saving HALT
    R[6] = ( (R[6] + 2) & 0xFFFF)>>>0;;
    if (RPLYrq) return;
    if (R[7] < 57344 /*0160000*/ )
        SetLPSW(/*uint8_t*/(word & 255));
    else {
        //load new mode
        psw = (word & 0x1FF /*0777*/)>>>0;
        if ((psw & 384) != 384) savepsw = psw;
        }
    self.Tick = RTItk;
}

function /*void*/ RTT ()  // RTT - Return from Trace Trap interrupt
{
    var /*uint16_t*/ word = GetWord(R[6]);
    R[6] = ( (R[6] + 2) & 0xFFFF)>>>0;;
    if (RPLYrq) return;
    R[7] = (word&0xFFFF)>>>0;	// Pop PC
    if ((psw & 384) != 384) savepc = R[7];
    word = GetWord ( R[6] );  // Pop PSW --- saving HALT
    R[6] = ( (R[6] + 2) & 0xFFFF)>>>0;;
    if (RPLYrq) return;
    if (R[7] < 57344 /*0160000*/ )
        SetLPSW(/*uint8_t*/(word & 255));
    else
        {
        //load new mode
        psw = (word & 0x1FF /*0777*/)>>>0;
        if ((psw & 384) != 384) savepsw = psw;
        }
    stepmode = ((word & PSW.T)!=0);

    self.Tick = RTItk;
}

function /*void*/ BPT ()  // BPT - Breakpoint
{
    BPT_rq = true;
    self.Tick = BPTtk;
}

function /*void*/ IOT ()  // IOT - I/O trap
{
    IOT_rq = true;
    self.Tick = EMTtk;
}

function /*void*/ RESET ()  // Reset input/output devices
{
    EVNTrq = false;
    self.MC.ResetDevices();  // INIT signal

    self.Tick = RESETtk;
}

function /*void*/ RTS ()  // RTS - return from subroutine
{
    var /*uint16_t*/ word;

    R[7] = (R[regdest]&0xFFFF)>>>0;
    if ((psw & 384) != 384) savepc = R[7];
	
    word = GetWord(R[6]);
    R[6] = ( (R[6] + 2) & 0xFFFF)>>>0;;
    if (RPLYrq) return;
    SetReg(regdest, word);
    self.Tick = RTStk;
}

function /*void*/ CCC ()
{
    SetLPSW((psw & 255) &  (~(/*uint8_t*/instr & 15 /*017*/ )));
    self.Tick = NOPtk;
}

function /*void*/ SCC ()
{
    SetLPSW((psw & 255) |  (/*uint8_t*/instr & 15 /*017*/ ));
    self.Tick = NOPtk;
}

function /*void*/ JMP ()  // JMP - jump: PC = &d (a-mode > 0)
{
    if (mdest == 0)  // incorrect addressing?
    {
        ILLGrq = true;
        self.Tick = EMTtk;
    }
    else
    {
        var /*uint16_t*/ word = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
		
        R[7] = (word&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];

        self.Tick = JMPtk[mdest-1];
    }
}

function /*void*/ SWAB ()	// swap word bytes hi,lo
{
    var /*uint16_t*/ ea = 0;
    var /*uint16_t*/ dst;
    var /*uint8_t*/ new_psw = (psw & 0xF0);

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        dst = R[regdest];

    dst = ((((dst >>> 8) & 255 /*0377*/ ) | (dst << 8))&0xFFFF)>>>0;

    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);

    if (RPLYrq) return;

    if ((dst & 128 /*0200*/ ) != 0) new_psw |= PSW.N;
    if ((dst & 255) == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = MOVtk[mdest][mdest];
}

function /*void*/ CLR ()  // CLR - clear
{
    var /*uint16_t*/ dst_addr;

    if (mdest)
    {
        dst_addr = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        SetWord(dst_addr, 0);
        if (RPLYrq) return;
    }
    else
        SetReg(regdest, 0);

    SetLPSW((psw & 0xF0) | PSW.Z);
    self.Tick = CLRtk[mdest];
}

function /*void*/ CLRB ()  // CLRB - clear byte
{
    var /*uint16_t*/ dst_addr;

    if (mdest)
    {
        dst_addr = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        GetByte(dst_addr);
        if (RPLYrq) return;
        SetByte(dst_addr, 0);
        if (RPLYrq) return;
    }
    else
        SetLReg(regdest, 0);

    SetLPSW((psw & 0xF0) | PSW.Z);
    self.Tick = CLRtk[mdest];
}

function /*void*/ COM()  // compare
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ dst;

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        dst = R[regdest];

    dst = ((~dst)&0xFFFF)>>>0;

    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ COMB ()  // compare byte
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint8_t*/ dst;

    if (mdest)
    {
        ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        dst = (R[regdest] & 255);

    dst = ((~dst)&255)>>>0;
	
    if (mdest)
        SetByte(ea, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ INC ()  // increment
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint16_t*/ dst;

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        dst = R[regdest];

    dst = ((dst+1)&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (dst == 32768 /*0100000*/ ) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ INCB ()  // increment byte
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint8_t*/ dst;

    if (mdest)
    {
        ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        dst = (R[regdest] & 255);

    dst = ((dst+1)&255)>>>0;
	
    if (mdest)
        SetByte(ea, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (dst == 128 /*0200*/ ) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ DEC ()  // decrement
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint16_t*/ dst;

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        dst = R[regdest];

    dst = ((dst-1)&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (dst == 32767 /*077777*/ ) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ DECB ()  // decrement byte
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint8_t*/ dst;

    if (mdest)
    {
        ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        dst = (R[regdest] & 255);

    dst = ((dst-1)&255)>>>0;
	
    if (mdest)
        SetByte(ea, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (dst == 127 /*0177*/ ) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ NEG ()	// negative
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ dst;

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        dst = R[regdest];

    dst = ((-dst)&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (dst == 32768 /*0100000*/ ) new_psw |= PSW.V;
    if (dst != 0) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ NEGB () // negative byte
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint8_t*/ dst;

    if (mdest)
    {
        ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        dst = (R[regdest] & 255);

    dst = ((-dst)&255)>>>0;
	
    if (mdest)
        SetByte(ea, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (dst == 128 /*0200*/ ) new_psw |= PSW.V;
    if (dst != 0) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ ADC ()	// ADC - add carry
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ dst;

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        dst = R[regdest];

    dst = ((dst+((psw & PSW.C) ? 1 : 0)) & 0xFFFF)>>>0;
	
    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if ((dst == 32768 /*0100000*/ ) && (psw & PSW.C)) new_psw |= PSW.V;
    if ((dst == 0) && (psw & PSW.C)) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ ADCB ()  // ADCB - add carry byte
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint8_t*/ dst;

    if (mdest)
    {
        ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        dst = (R[regdest] & 255);

    dst = ((dst+((psw & PSW.C) ? 1 : 0)) & 255)>>>0;
	
    if (mdest)
        SetByte(ea, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if ((dst == 128 /*0200*/ ) && (psw & PSW.C)) new_psw |= PSW.V;
    if ((dst == 0) && (psw & PSW.C)) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ SBC ()	// SBC - subtract carry
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ dst;

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        dst = R[regdest];

    dst = ((dst-((psw & PSW.C) ? 1 : 0)) & 0xFFFF)>>>0;
	
    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if ((dst == 32767 /*077777*/ ) && (psw & PSW.C)) new_psw |= PSW.V;
    if ((dst == 65535 /*0177777*/ ) && (psw & PSW.C)) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ SBCB ()	// SBC - subtract carry byte
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint8_t*/ dst;

    if (mdest)
    {
        ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        dst = (R[regdest] & 255);

    dst = ((dst-((psw & PSW.C) ? 1 : 0))&255)>>>0;
	
    if (mdest)
        SetByte(ea, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if ((dst == 127 /*0177*/ ) && (psw & PSW.C)) new_psw |= PSW.V;
    if ((dst == 255 /*0377*/ ) && (psw & PSW.C)) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ TST ()  // TST
{
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ dst;

    if (mdest)
    {
        var /*uint16_t*/ ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        dst = R[regdest];

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = TSTtk[mdest];
}

function /*void*/ TSTB ()  // TSTB byte
{
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint8_t*/ dst;

    if (mdest)
    {
        var /*uint16_t*/ ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        dst = (R[regdest] & 255);

    dst = (dst&255)>>>0;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = TSTtk[mdest];
}

function /*void*/ ROR ()  // ROR - rotate right
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ src, dst;

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        src = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        src = R[regdest];

    dst = (((src >>> 1) | ((psw & PSW.C) ? 32768 /*0100000*/: 0))&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (src & 1) new_psw |= PSW.C;
    if (((new_psw & PSW.N) != 0) != ((new_psw & PSW.C) != 0)) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ RORB ()  // RORB- rotate right byte
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint8_t*/ src, dst;

    if (mdest)
    {
        ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        src = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        src = (R[regdest] & 255);

    dst = (((src >>> 1) | ((psw & PSW.C) ? 128 /*0200*/: 0))&255)>>>0;
	
    if (mdest)
        SetByte(ea, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (src & 1) new_psw |= PSW.C;
    if (((new_psw & PSW.N) != 0) != ((new_psw & PSW.C) != 0)) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ ROL ()  // ROL - rotate left
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ src, dst;

    if (mdest)
    {
        ea = GetWordAddr(/*uint8_t*/mdest, /*uint8_t*/regdest);
        if (RPLYrq) return;
        src = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        src = R[regdest];

    dst = (((src << 1) | ((psw & PSW.C) ? 1 : 0))&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (src & 32768 /*0100000*/ ) new_psw |= PSW.C;
    if (((new_psw & PSW.N) != 0) != ((new_psw & PSW.C) != 0)) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ ROLB ()  // ROLB - rotate left byte
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint8_t*/ src, dst;

    if (mdest)
    {
        ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        src = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        src = (R[regdest] & 255);

    dst = (((src << 1) | ((psw & PSW.C) ? 1 : 0))&255)>>>0;
	
    if (mdest)
        SetByte(ea, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (src & 128 /*0200*/ ) new_psw |= PSW.C;
    if (((new_psw & PSW.N) != 0) != ((new_psw & PSW.C) != 0)) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ ASR ()  // ASR - arithmetic shift right
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ src, dst;

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        src = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        src = R[regdest];

    dst = (((src >>> 1) | (src & 32768 /*0100000*/ ))&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (src & 1) new_psw |= PSW.C;
    if (((new_psw & PSW.N) != 0) != ((new_psw & PSW.C) != 0)) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ ASRB ()  // ASRB - arithmetic shift right byte
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint8_t*/ src, dst;

    if (mdest)
    {
        ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        src = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        src = (R[regdest] & 255);

    dst = (((src >>> 1) | (src & 128 /*0200*/ ))&255)>>>0;
	
    if (mdest)
        SetByte(ea, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (src & 1) new_psw |= PSW.C;
    if (((new_psw & PSW.N) != 0) != ((new_psw & PSW.C) != 0)) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ ASL ()  // ASL - arithmetic shift left
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ src, dst;

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        src = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        src = R[regdest];

    dst = ((src << 1)&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (src & 32768 /*0100000*/ ) new_psw |= PSW.C;
    if (((new_psw & PSW.N) != 0) != ((new_psw & PSW.C) != 0)) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ ASLB ()  // ASLB - arithmetic shift left byte
{
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint8_t*/ src, dst;

    if (mdest)
    {
        ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        src = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        src = (R[regdest] & 255);

    dst = ((src << 1)&255)>>>0;
	
    if (mdest)
        SetByte(ea, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (src & 128 /*0200*/ ) new_psw |= PSW.C;
    if (((new_psw & PSW.N) != 0) != ((new_psw & PSW.C) != 0)) new_psw |= PSW.V;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ SXT ()  // SXT - sign-extend
{
    var /*uint8_t*/ new_psw = psw & 0xF9;
	var g = ((psw & PSW.N) ? 65535 /*0177777*/ : 0);
    if (mdest)
    {
        var /*uint16_t*/ ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        SetWord(ea, g);
        if (RPLYrq) return;
    }
    else
        SetReg(regdest, g); //sign extend

    if (!(psw & PSW.N)) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ MTPS ()  // MTPS - move to PS
{
    var /*uint8_t*/ dst;
    if (mdest)
    {
        var /*uint16_t*/ ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetByte(ea);
        if (RPLYrq) return;
    }
    else
        dst = (R[regdest] & 255);

    SetLPSW((psw & 0x10) | (dst & 0xEF));
    if ((psw & 384) != 384) savepc = R[7];
    self.Tick = MTPStk[mdest];
}

function /*void*/ MFPS ()  // MFPS - move from PS
{
    var /*uint8_t*/ psw = (psw & 255);
    var /*uint8_t*/ new_psw = psw & 0xF1;

    if (mdest)
    {
        var /*uint16_t*/ ea = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        GetByte(ea);
        if (RPLYrq) return;
        SetByte(ea, psw);
        if (RPLYrq) return;
    }
    else
        SetReg(regdest, /*uint16_t*/psw);

    if (psw & 128 /*0200*/ ) new_psw |= PSW.N;
    if (psw == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = CLRtk[mdest];
}

function /*void*/ BR ()	// go branch
{
    var v = instr&255>>>0; if(v&128) v-=256;
    R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
    if ((psw & 384) != 384) savepc = R[7];
    self.Tick = BRtk;
}

function /*void*/ BNE ()	// branch not equal
{
    if (psw & PSW.Z)
        self.Tick = BRANCH_FALSEtk;
    else
    {
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
        self.Tick = BRANCH_TRUEtk;
    }
}

function /*void*/ BEQ ()	// branch if equal
{
    if (!(psw & PSW.Z))
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
		if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BGE ()	// branch if greater or equal
{
    if ( ((psw & PSW.N) != 0) != ((psw & PSW.V) != 0) )
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BLT ()	// branch if less
{
    if (((psw & PSW.N) != 0) == ((psw & PSW.V) != 0))
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BGT ()	// branch if greater
{
    if ((((psw & PSW.N) != 0) != ((psw & PSW.V) != 0)) || (psw & PSW.Z))
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BLE ()	// branch if less or equal
{
    if (! ((((psw & PSW.N) != 0) != ((psw & PSW.V) != 0)) || (psw & PSW.Z)))
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BPL ()	//branch if positive or zero
{
    if (psw & PSW.N)
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BMI ()	// branch if negative
{
    if (!(psw & PSW.N))
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BHI ()	// branch if higher (if no carry or zero)
{
    if ((psw & PSW.Z) || (psw & PSW.C))
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BLOS ()		// branch if carry or zero
{
    if (!((psw & PSW.Z) || (psw & PSW.C)))
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BVC ()	// branch if overflow clear
{
    if (psw & PSW.V)
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BVS ()	// branch if overflow set
{
    if (!(psw & PSW.V))
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BHIS ()	// branch if carry clear
{
    if (psw & PSW.C)
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ BLO ()	// branch if carry set
{
    if (!(psw & PSW.C))
        self.Tick = BRANCH_FALSEtk;
    else
    {
        self.Tick = BRANCH_TRUEtk;
        var v = instr&255>>>0; if(v&128) v-=256;
        R[7] = ((R[7] + (v*2))&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ XOR ()  // XOR
{
    var /*uint16_t*/ dst;
    var /*uint16_t*/ ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF1;

    if (mdest)
    {
        ea = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        dst = GetWord(ea);
        if (RPLYrq) return;
    }
    else
        dst = R[regdest];

    dst ^= R[regsrc];
    dst = (dst&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(ea, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = XORtk[mdest];
}

function /*void*/ MUL ()  // MUL - multiply
{
    var /*uint16_t*/ dst = R[regsrc];
    var /*uint16_t*/ src, res, ea = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;

    if (mdest) ea = GetWordAddr(mdest, regdest);
    if (RPLYrq) return;
    src = mdest ? GetWord(ea) : R[regdest];
    if (RPLYrq) return;

    var /*(signed short)*/ D = dst; if(D & 32768) D-=0x10000;
    var /*(signed short)*/ S = src; if(S & 32768) S-=0x10000;
    var /*int*/ r = (D * S);
    res = (r & 0xFFFF)>>>0;

    SetReg(regsrc, ((res >>> 16) & 0xFFFF));
    SetReg(regsrc | 1, (res & 0xFFFF));
	
    if (r < 0) new_psw |= PSW.N;
    if (r == 0) new_psw |= PSW.Z;
    if ((r > 32767) || (r < -32768)) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = MULtk[mdest];
}

function /*void*/ DIV ()  // DIV - divide
{
    var /*uint16_t*/ ea = 0;
    var /*uint16_t*/ res, res1;
    var /*uint8_t*/ new_psw = psw & 0xF0;

    if (mdest) ea = GetWordAddr(mdest, regdest);
    if (RPLYrq) return;
    var /*int*/ src2 = (mdest ? GetWord(ea) : R[regdest]);
    if (RPLYrq) return;

    var /*int32_t*/ longsrc = ((R[regsrc | 1] | (R[regsrc] << 16)) & 0xFFFFFFFF)>>>0;

    self.Tick = DIVtk[mdest];

    if (src2 == 0)
    {
        new_psw |= (PSW.V | PSW.C); //divide 0 -- set V and C
        SetLPSW(new_psw);
        return;
    }
    if ((longsrc == 0x80000000 /*020000000000*/ ) && (src2 == 0xFFFF))
    {
        new_psw |= PSW.V; // overflow
        SetLPSW(new_psw);
        return;
    }
	
    var /*(signed short)*/ r = (longsrc / src2)|0;
    res = (r & 0xFFFF)>>>0;
    res1 = longsrc % src2;

    if((r > 32767) || (r < -32768))
    {
        new_psw |= PSW.V; // overflow
        SetLPSW(new_psw);
        return;
    }

    SetReg(regsrc | 1, res1 & 65535 /*0177777*/ );
    SetReg(regsrc, res & 65535 /*0177777*/ );

    if (res & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (res == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
}

function /*void*/ ASH ()  // ASH - arithmetic shift
{
    var /*uint16_t*/ ea = 0;
    var /*short*/ src, dst;
    var /*uint8_t*/ new_psw = psw & 0xF0;

    if (mdest) ea = GetWordAddr(mdest, regdest);
    if (RPLYrq) return;
    src = (mdest ? GetWord(ea) : R[regdest]);
    if (RPLYrq) return;
    src &= 0x3F;
    if(src & 32 /*040*/ ) src-=64;	// convert to signed
    dst = R[regsrc];

    self.Tick = ASHtk[mdest];
	
    if (src >= 0)
    {
        while (src--)
        {
            if (dst & 32768 /*0100000*/ ) new_psw |= PSW.C; else new_psw &= (~PSW.C);
            dst = ((dst<<1) & 0xFFFF)>>>0;
            if (((dst & 32768 /*0100000*/)!=0) != ((new_psw & PSW.C)!=0)) new_psw |= PSW.V;
            self.Tick += ASH_Stk;
        }
    }
    else
    {
        while ((src++)!=0)
        {
            if (dst & 1) new_psw |= PSW.C; else new_psw &= (~PSW.C);
            dst >>>= 1;
            self.Tick += ASH_Stk;
        }
    }

    SetReg(regsrc, dst);	
    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);

}

function /*void*/ ASHC ()  //  ASHC - arithmetic shift combined
{
    var /*uint16_t*/ ea = 0, src;
    var /*int32_t*/ dst;
    var /*uint8_t*/ new_psw = psw & 0xF0;

    if (mdest) ea = GetWordAddr(mdest, regdest);
    if (RPLYrq) return;
    src = (mdest ? GetWord(ea) : R[regdest]);
    if (RPLYrq) return;
    src &= 0x3F;
    if(src & 32 /*040*/ ) src-=64;	// convert to signed
    dst = R[regsrc | 1] | (R[regsrc] << 16);
	
    self.Tick = ASHCtk[mdest];
	
    if (src >= 0)
    {
        while (src--)
        {
            if (dst & 0x80000000) new_psw |= PSW.C; else new_psw &= (~PSW.C);
            dst = ((dst<<1) & 0xFFFFFFFF)>>>0;
            if (((dst & 0x80000000 /*0100000*/ )!=0) != ((new_psw & PSW.C)!=0)) new_psw |= PSW.V;
            self.Tick += ASHC_Stk;
        }
    }
    else
    {
        while ((src++)!=0)
        {
            if (dst & 1) new_psw |= PSW.C; else new_psw &= (~PSW.C);
            dst >>= 1;
            self.Tick += ASH_Stk;
        }
    }
	
    SetReg(regsrc, ((dst >>> 16) & 0xFFFF));
    SetReg(regsrc | 1,(dst & 0xFFFF));

    SetN(dst & 0x80000000);
    SetZ(dst == 0);
    if (dst & 0x80000000) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);

}

function /*void*/ SOB ()  // SOB - subtract one: R = R - 1 ; if R != 0 : PC = PC - 2*nn
{
    var /*uint16_t*/ dst = R[regsrc];

    self.Tick = SOB_LASTtk;

    dst = ((--dst)&0xFFFF)>>>0;
	
    SetReg(regsrc, dst);

    if (dst)
    {
        self.Tick = SOBtk;
        R[7] = ((R[7] - ((instr & 63 /*077*/ )<<1) )&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
    }
}

function /*void*/ MOV ()  // MOV - move
{
    var /*uint16_t*/ src_addr, dst_addr, dst;
    var /*uint8_t*/ new_psw = psw & 0xF1;

    if (msrc)
    {
        src_addr = GetWordAddr(msrc, regsrc);
        if (RPLYrq) return;
        dst = GetWord(src_addr);
        if (RPLYrq) return;
    }
    else
        dst = R[regsrc];

    if (mdest)
    {
        dst_addr = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        SetWord(dst_addr, dst);
        if (RPLYrq) return;
    }
    else
        SetReg(regdest, dst);
		
    dst = (dst&0xFFFF)>>>0;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = MOVtk[msrc][mdest];
}

function /*void*/ MOVB ()  // MOVB - move byte
{
    var /*uint16_t*/ src_addr, dst_addr;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint8_t*/ dst;

    if (msrc)
    {
        src_addr = GetByteAddr(msrc, regsrc);
        if (RPLYrq) return;
        dst = GetByte(src_addr);
        if (RPLYrq) return;
    }
    else
        dst = (R[regsrc] & 255);

    if (mdest)
    {
        dst_addr = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        GetByte(dst_addr);
        if (RPLYrq) return;
        SetByte(dst_addr, dst);
        if (RPLYrq) return;
    }
    else
        {
        var g = dst; if(g&128) g|=0xFF00;	// sign extension 65280
        SetReg(regdest, g);
        }
		
    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = MOVBtk[msrc][mdest];
}

function /*void*/ CMP ()	// compare
{
    var /*uint16_t*/ src_addr, dst_addr, src, src2, dst;
    var /*uint8_t*/ new_psw = psw & 0xF0;

    if (msrc)
    {
        src_addr = GetWordAddr(msrc, regsrc);
        if (RPLYrq) return;
        src = GetWord(src_addr);
        if (RPLYrq) return;
    }
    else
        src = R[regsrc];

    if (mdest)
    {
        dst_addr = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        src2 = GetWord(dst_addr);
        if (RPLYrq) return;
    }
    else
        src2 = R[regdest];

    dst = ((src - src2)&0xFFFF)>>>0;
	
    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (((src ^ src2) & (~(dst ^ src2))) & 32768 /*0100000*/ ) new_psw |= PSW.V;
    if (((~src & src2) | ((~(src ^ src2)) & dst)) & 32768 /*0100000*/ ) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = CMPtk[msrc][mdest];
}

function /*void*/ CMPB ()	// compare byte
{
    var /*uint16_t*/ src_addr, dst_addr;
    var /*uint8_t*/ new_psw = psw & 0xF0;

    var /*uint8_t*/ src, src2, dst;

    if (msrc)
    {
        src_addr = GetByteAddr(msrc, regsrc);
        if (RPLYrq) return;
        src = GetByte(src_addr);
        if (RPLYrq) return;
    }
    else
        src = (R[regsrc] & 255);

    if (mdest)
    {
        dst_addr = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        src2 = GetByte(dst_addr);
        if (RPLYrq) return;
    }
    else
        src2 = (R[regdest] & 255);

    dst = ((src - src2)&255)>>>0;
	
    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (((src ^ src2) & (~(dst ^ src2))) & 128 /*0200*/ ) new_psw |= PSW.V;
    if (((~src & src2) | ((~(src ^ src2)) & dst)) & 128 /*0200*/ ) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = CMPtk[msrc][mdest];
}

function /*void*/ BIT ()  // BIT - bit test
{
    var /*uint16_t*/ src_addr, dst_addr;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint16_t*/ src, src2, dst;

    if (msrc)
    {
        src_addr = GetWordAddr(msrc, regsrc);
        if (RPLYrq) return;
        src = GetWord(src_addr);
        if (RPLYrq) return;
    }
    else
        src  = R[regsrc];

    if (mdest)
    {
        dst_addr = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        src2 = GetWord(dst_addr);
        if (RPLYrq) return;
    }
    else
        src2 = R[regdest];

    dst = ((src2 & src)&0xFFFF)>>>0;
	
    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = CMPtk[msrc][mdest];
}

function /*void*/ BITB ()  // BITB - bit test byte
{
    var /*uint16_t*/ src_addr, dst_addr;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint8_t*/ src, src2, dst;

    if (msrc)
    {
        src_addr = GetByteAddr(msrc, regsrc);
        if (RPLYrq) return;
        src = GetByte(src_addr);
        if (RPLYrq) return;
    }
    else
        src = (R[regsrc] & 255);

    if (mdest)
    {
        dst_addr = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        src2 = GetByte(dst_addr);
        if (RPLYrq) return;
    }
    else
        src2 = (R[regdest] & 255);

    dst = ((src2 & src)&255)>>>0;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = CMPtk[msrc][mdest];
}

function /*void*/ BIC()  // BIC - bit clear
{
    var /*uint16_t*/ src_addr, dst_addr = 0;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint16_t*/ src,  src2, dst;

    if (msrc)
    {
        src_addr = GetWordAddr(msrc, regsrc);
        if (RPLYrq) return;
        src = GetWord(src_addr);
        if (RPLYrq) return;
    }
    else
        src  = R[regsrc];

    if (mdest)
    {
        dst_addr = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        src2 = GetWord(dst_addr);
        if (RPLYrq) return;
    }
    else
        src2 = R[regdest];

    dst = ((src2 & (~src))&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(dst_addr, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = MOVtk[msrc][mdest];
}

function /*void*/ BICB ()  // BICB - bit clear byte
{
    var /*uint16_t*/ src_addr, dst_addr = 0;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint8_t*/ src, src2, dst;

    if (msrc)
    {
        src_addr = GetByteAddr(msrc, regsrc);
        if (RPLYrq) return;
        src = GetByte(src_addr);
        if (RPLYrq) return;
    }
    else
        src = (R[regsrc] & 255);

    if (mdest)
    {
        dst_addr = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        src2 = GetByte(dst_addr);
        if (RPLYrq) return;
    }
    else
        src2 = (R[regdest] & 255);

    dst = ((src2 & (~src))&255)>>>0;

    if (mdest)
        SetByte(dst_addr, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = MOVBtk[msrc][mdest];
}

function /*void*/ BIS()  // BIS - bit set
{
    var /*uint16_t*/ src_addr, dst_addr = 0;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint16_t*/ src, src2, dst;

    if (msrc)
    {
        src_addr = GetWordAddr(msrc, regsrc);
        if (RPLYrq) return;
        src = GetWord(src_addr);
        if (RPLYrq) return;
    }
    else
        src  = R[regsrc];

    if (mdest)
    {
        dst_addr = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        src2 = GetWord(dst_addr);
        if (RPLYrq) return;
    }
    else
        src2 = R[regdest];

    dst = ((src2 | src)&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(dst_addr, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = MOVtk[msrc][mdest];
}

function /*void*/ BISB ()  // BISB - bit set byte
{
    var /*uint16_t*/ src_addr, dst_addr = 0;
    var /*uint8_t*/ new_psw = psw & 0xF1;
    var /*uint8_t*/ src, src2, dst;

    if (msrc)
    {
        src_addr = GetByteAddr(msrc, regsrc);
        if (RPLYrq) return;
        src = GetByte(src_addr);
        if (RPLYrq) return;
    }
    else
        src = (R[regsrc] & 255);

    if (mdest)
    {
        dst_addr = GetByteAddr(mdest, regdest);
        if (RPLYrq) return;
        src2 = GetByte(dst_addr);
        if (RPLYrq) return;
    }
    else
        src2 = (R[regdest] & 255);

    dst = ((src2 | src)&255)>>>0;
	
    if (mdest)
        SetByte(dst_addr, dst);
    else
        SetLReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 128 /*0200*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    SetLPSW(new_psw);
    self.Tick = MOVBtk[msrc][mdest];
}

function /*void*/ ADD ()  // ADD - add
{
    var /*uint16_t*/ src_addr, dst_addr = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ src, src2, dst;

    if (msrc)
    {
        src_addr = GetWordAddr(msrc, regsrc);
        if (RPLYrq) return;
        src = GetWord(src_addr);
        if (RPLYrq) return;
    }
    else
        src = R[regsrc];

    if (mdest)
    {
        dst_addr = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        src2 = GetWord(dst_addr);
        if (RPLYrq) return;
    }
    else
        src2 = R[regdest];

    dst = ((src2 + src)&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(dst_addr, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (((~(src ^ src2)) & (dst ^ src2)) & 32768 /*0100000*/ ) new_psw |= PSW.V;
    if (((src & src2) | ((src ^ src2) & (~dst))) & 32768 /*0100000*/ ) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = MOVBtk[msrc][mdest];
}

function /*void*/ SUB ()	// SUB - subtract
{
    var /*uint16_t*/ src_addr, dst_addr = 0;
    var /*uint8_t*/ new_psw = psw & 0xF0;
    var /*uint16_t*/ src, src2, dst;

    if (msrc)
    {
        src_addr = GetWordAddr(msrc, regsrc);
        if (RPLYrq) return;
        src = GetWord(src_addr);
        if (RPLYrq) return;
    }
    else
        src = R[regsrc];

    if (mdest)
    {
        dst_addr = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;
        src2 = GetWord(dst_addr);
        if (RPLYrq) return;
    }
    else
        src2 = R[regdest];

    dst = ((src2 - src)&0xFFFF)>>>0;
	
    if (mdest)
        SetWord(dst_addr, dst);
    else
        SetReg(regdest, dst);
    if (RPLYrq) return;

    if (dst & 32768 /*0100000*/ ) new_psw |= PSW.N;
    if (dst == 0) new_psw |= PSW.Z;
    if (((src ^ src2) & (~(dst ^ src))) & 32768 /*0100000*/ ) new_psw |= PSW.V;
    if (((src & (~src2)) | ((~(src ^ src2)) & dst)) & 32768 /*0100000*/ ) new_psw |= PSW.C;
    SetLPSW(new_psw);
    self.Tick = MOVBtk[msrc][mdest];
}

function /*void*/ EMT ()  // EMT - emulator trap
{
    EMT_rq = true;
    self.Tick = EMTtk;
}

function /*void*/ TRAP ()	// trap interrupt
{
    TRAPrq = true;
    self.Tick = EMTtk;
}

function /*void*/ JSR ()  // JSR - Jump subroutine: *--SP = R; R = PC; PC = &d (a-mode > 0)
{
    if (mdest == 0)
    {
        // Incorrect addressing method
        ILLGrq = true;
        self.Tick = EMTtk;
    }
    else
    {
        var /*uint16_t*/ dst = GetWordAddr(mdest, regdest);
        if (RPLYrq) return;

        R[6] = ( (R[6] - 2) & 0xFFFF)>>>0;;
        SetWord( R[6], R[regsrc] );
        SetReg(regsrc, R[7]);
        R[7] = (dst&0xFFFF)>>>0;
        if ((psw & 384) != 384) savepc = R[7];
		
        if (RPLYrq) return;

        self.Tick = JSRtk[mdest-1];
    }
}

function /*void*/ MARK ()  // MARK - kind of stack garbage collector when returning from sub-call
{
    R[6] = ( ( R[7] + ((instr & 0x3F)<<1) ) & 0xFFFF)>>>0;
    R[7] = R[5];
    if ((psw & 384) != 384) savepc = R[7];
    SetReg(5, GetWord( R[6] ));
    R[6] = ( (R[6] + 2) & 0xFFFF)>>>0;;
    if (RPLYrq) return;

    self.Tick = MARKtk;
}


//--------------------------------------------------------------
//
// CPU image format (64 bytes):
//   2   bytes      PSW
//   2*8 bytes      Registers R0..R7
//   2*2 bytes      Saved PC and PSW
//   2   byte       Stopped flag: 1 - stopped, 0 - not stopped
//   2   bytes      Internal tick count
//   3   bytes      Flags
//   1   byte       VIRQ reset request
//   2   bytes      Reserved
//  32   bytes      VIRQ vectors


/*void*/ this.SaveToImage = function(/*Uint8array*/ I,o)
{
    // Processor data                               // Offset Size
	var k;												//    0    --
    waddI8 ( I,o, psw );              				//    0     2   PSW

    for(k=0;k<8;k++) {
		waddI8 ( I,o, R[k] );						//    2    16   Registers R0-R7
		};
		
    waddI8 ( I,o, savepc );							//   18     2   PC'
    waddI8 ( I,o, savepsw );      					//   20     2   PSW'
	
	var t = (self.Stopped ? 1 : 0)					//   22     2   Stopped
    waddI8 ( I,o, t ); 
 	
    waddI8 ( I,o, self.Tick );						//   24     2   Internal tick count

    var /*uint8_t*/ flags0 = 0;
    flags0 |= (stepmode ?   1 : 0);
    flags0 |= (buserror ?   2 : 0);
    flags0 |= (haltpin  ?   4 : 0);
    flags0 |= (DCLOpin  ?   8 : 0);
    flags0 |= (ACLOpin  ?  16 : 0);
    flags0 |= (waitmode ?  32 : 0);
    I[o.i++] = flags0;                            //   26     1   Flags
    var /*uint8_t*/ flags1 = 0;
    flags1 |= (STRTrq ?   1 : 0);
    flags1 |= (RPLYrq ?   2 : 0);
    flags1 |= (ILLGrq ?   4 : 0);
    flags1 |= (RSVDrq ?   8 : 0);
    flags1 |= (TBITrq ?  16 : 0);
    flags1 |= (ACLOrq ?  32 : 0);
    flags1 |= (HALTrq ?  64 : 0);
    flags1 |= (EVNTrq ? 128 : 0);
    I[o.i++] = flags1;                            //   27     1   Flags
    var /*uint8_t*/ flags2 = 0;
    flags2 |= (FIS_rq ?   1 : 0);
    flags2 |= (BPT_rq ?   2 : 0);
    flags2 |= (IOT_rq ?   4 : 0);
    flags2 |= (EMT_rq ?   8 : 0);
    flags2 |= (TRAPrq ?  16 : 0);
    flags2 |= (ACLOreset ? 32 : 0);
    flags2 |= (EVNTreset ? 64 : 0);
    I[o.i++] = flags2;                            	//   28     1   Flags
    I[o.i++] = VIRQreset;                       	//   29     1   VIRQ reset request
    //                                              //   30     2   Reserved
	waddI8 ( I,o, 0 ); 
    for(k=0;k<16;k++) {            //   32    32   VIRQ vectors
		waddI8 ( I,o, virq[k] );
		};
}


/*void*/ this.LoadFromImage = function ( /*uint8_t[] */ I )
{
    var i=0, k;
    psw = N16( I[i++], I[i++] );                             //    0     2   PSW
	for(k=0;k<8;k++) R[k] = N16( I[i++], I[i++] );				//    2    16   Registers R0-R7
    savepc    = N16( I[i++], I[i++] );                       //   18     2   PC'
    savepsw   = N16( I[i++], I[i++] );                       //   20     2   PSW'
    self.Stopped = (N16( I[i++], I[i++] ) != 0);                //   22     2   Stopped
    self.Tick = N16( I[i++], I[i++] );                    //   24     2   Internal tick count
    var /*uint8_t*/ flags0 = I[i++];                    //   26     1   Flags
    stepmode  = ((flags0 &  1) != 0);
    buserror  = ((flags0 &  2) != 0);
    haltpin   = ((flags0 &  4) != 0);
    DCLOpin   = ((flags0 &  8) != 0);
    ACLOpin   = ((flags0 & 16) != 0);
    waitmode  = ((flags0 & 32) != 0);
    var /*uint8_t*/ flags1 = I[i++];                    //   27     1   Flags
    STRTrq    = ((flags1 &   1) != 0);
    RPLYrq    = ((flags1 &   2) != 0);
    ILLGrq    = ((flags1 &   4) != 0);
    RSVDrq    = ((flags1 &   8) != 0);
    TBITrq    = ((flags1 &  16) != 0);
    ACLOrq    = ((flags1 &  32) != 0);
    HALTrq    = ((flags1 &  64) != 0);
    EVNTrq    = ((flags1 & 128) != 0);
    var /*uint8_t*/ flags2 = I[i++];                    //   28     1   Flags
    FIS_rq    = ((flags2 &  1) != 0);
    BPT_rq    = ((flags2 &  2) != 0);
    IOT_rq    = ((flags2 &  4) != 0);
    EMT_rq    = ((flags2 &  8) != 0);
    TRAPrq    = ((flags2 & 16) != 0);
    ACLOreset = ((flags2 & 32) != 0);
    EVNTreset = ((flags2 & 64) != 0);
    VIRQreset = I[i++];                       //   29     1   VIRQ reset request
    //                                              //   30     2   Reserved
	i+=2;
	for(k=0;k<16;k++) virq[k] = N16( I[i++], I[i++] ); 	//   32    32   VIRQ vectors        
}


	self.Processor();
	return self;
}

