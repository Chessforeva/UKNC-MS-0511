
/* Disassembler part for KM1801VM2 processor */

Disasm = function() {

var self = this;

var Instr = "";
var Arg = "";
var Dst = "";
var Src = "";

// to obtain result after from dbg
this.getInstr = function() { return Instr; }
this.getArg = function() { return Arg; }

var regName = [ "R0", "R1", "R2", "R3", "R4", "R5", "SP", "PC" ];

function StrFormat(i,n) {

	switch (i)
    {
    case 0: return ''+n;
	case 1: return '('+n+')';
	case 2: return '('+n+')+';
	case 3: return '@('+n+')+';
	case 4: return '-('+n+')';
	case 5: return '@-('+n+')';
	case 6: return ''+OCT(n);
	case 7: return '@'+OCT(n);
	}
};

function Str_pc_Format(i,n) {

	switch (i)
    {
    case 0: return 'PC';
	case 1: return '(PC)';
	case 2: return '#'+OCT(n);
	case 3: return '@#'+OCT(n);
	case 4: return '-(PC)';
	case 5: return '@-(PC)';
	case 6: return ''+OCT(n);
	case 7: return '@'+OCT(n);
	}
};

function /*uint16_t*/ SrcStr(/*uint16_t*/ instr, /*uint16_t*/ addr, /*uint16_t*/ code)
{
    var /*uint8_t*/ reg = getDigit[instr][2];
    var /*uint8_t*/ p = getDigit[instr][3];

    var /*string*/ pszReg = regName[reg];

	Src = '';
	
    if (reg != 7)
    {
        if (p == 6 || p == 7)
        {
            Src =  StrFormat(p,code) + "(" + pszReg + ")";
            return 1;
        }
        else
            Src = StrFormat(p,pszReg);
    }
    else
    {
        if (p == 2 || p == 3)
        {
            Src =  Str_pc_Format(p,code);
            return 1;
        }
        else if (p == 6 || p == 7)
        {
			Src =  Str_pc_Format(p, ADDRESS(addr+code+2) );
            return 1;
        }
        else
            Src = StrFormat(p,pszReg);
    }

    return 0;
}

function /*uint16_t*/ DstStr (/*uint16_t*/ instr, /*uint16_t*/ addr, /*uint16_t*/ code)
{
    var /*uint8_t*/ reg = getDigit[instr][0];
    var /*uint8_t*/ p = getDigit[instr][1];

    var /*string*/ pszReg = regName[reg];
	
	Dst = '';
	
    if (reg != 7)
    {
        if (p == 6 || p == 7)
        {
            Dst =  StrFormat(p,code) + "(" + pszReg + ")";
            return 1;
        }
        else
            Dst = StrFormat(p,pszReg);
    }
    else
    {
        if (p == 2 || p == 3)
        {
            Dst =  Str_pc_Format(p,code);
            return 1;
        }
        else if (p == 6 || p == 7)
        {
			Dst =  Str_pc_Format(p, ADDRESS(addr+code+2) );
            return 1;
        }
        else
            Dst = StrFormat(p,pszReg);
    }

    return 0;
}

// Disassemble one instruction
//   memory - memory image (we read only words of the instruction)
//   Return value: number of words in the instruction


/*uint16_t*/ this.DisassembleInstruction = function(/*uint16_t[3] */memory, /*uint16_t*/ addr)
{
    Instr = "";
    Arg = "";
	Dst = "";
	Src = "";

    var /*uint16_t*/ instr = memory[0], m = memory[1];

    var length = 1;

    // No fields
    switch (instr)
    {
    case PI.HALT:   Instr = "HALT";   return 1;
    case PI.WAIT:   Instr = "WAIT";   return 1;
    case PI.RTI:    Instr = "RTI";    return 1;
    case PI.BPT:    Instr = "BPT";    return 1;
    case PI.IOT:    Instr = "IOT";    return 1;
    case PI.RESET:  Instr = "RESET";  return 1;
    case PI.RTT:    Instr = "RTT";    return 1;
    case PI.NOP:    Instr = "NOP";    return 1;
    case PI.CLC:    Instr = "CLC";    return 1;
    case PI.CLV:    Instr = "CLV";    return 1;
    case PI.CLVC:   Instr = "CLVC";   return 1;
    case PI.CLZ:    Instr = "CLZ";    return 1;
    case PI.CLZC:   Instr = "CLZC";   return 1;
    case PI.CLZV:   Instr = "CLZV";   return 1;
    case PI.CLZVC:  Instr = "CLZVC";  return 1;
    case PI.CLN:    Instr = "CLN";    return 1;
    case PI.CLNC:   Instr = "CLNC";   return 1;
    case PI.CLNV:   Instr = "CLNV";   return 1;
    case PI.CLNVC:  Instr = "CLNVC";  return 1;
    case PI.CLNZ:   Instr = "CLNZ";   return 1;
    case PI.CLNZC:  Instr = "CLNZC";  return 1;
    case PI.CLNZV:  Instr = "CLNZV";  return 1;
    case PI.CCC:    Instr = "CCC";    return 1;
    case PI.NOP260: Instr = "NOP260"; return 1;
    case PI.SEC:    Instr = "SEC";    return 1;
    case PI.SEV:    Instr = "SEV";    return 1;
    case PI.SEVC:   Instr = "SEVC";   return 1;
    case PI.SEZ:    Instr = "SEZ";    return 1;
    case PI.SEZC:   Instr = "SEZC";   return 1;
    case PI.SEZV:   Instr = "SEZV";   return 1;
    case PI.SEZVC:  Instr = "SEZVC";  return 1;
    case PI.SEN:    Instr = "SEN";    return 1;
    case PI.SENC:   Instr = "SENC";   return 1;
    case PI.SENV:   Instr = "SENV";   return 1;
    case PI.SENVC:  Instr = "SENVC";  return 1;
    case PI.SENZ:   Instr = "SENZ";   return 1;
    case PI.SENZC:  Instr = "SENZC";  return 1;
    case PI.SENZV:  Instr = "SENZV";  return 1;
    case PI.SCC:    Instr = "SCC";    return 1;

  
    case PI.START:  Instr = "START";  return 1;
    case PI.STEP:   Instr = "STEP";   return 1;
    case PI.RSEL:   Instr = "RSEL";   return 1;
    case PI.MFUS:   Instr = "MFUS";   return 1;
    case PI.RCPC:   Instr = "RCPC";   return 1;
    case PI.RCPS:   Instr = "RCPS";   return 1;
    case PI.MTUS:   Instr = "MTUS";   return 1;
    case PI.WCPC:   Instr = "WCPC";   return 1;
    case PI.WCPS:   Instr = "WCPS";   return 1;
    }

    // One field
    if ((instr & (~7)) == PI.RTS)
    {
        if (getDigit[instr][0] == 7)
        {
            Instr = "RETURN";
        }
        else
        {
            Instr = "RTS";
            Arg = regName[getDigit[instr][0]];
        }
        return 1;
    }

    // Two fields
    length += DstStr(instr, ADDRESS(addr+2), m);

    switch (instr & (~63) /*077*/ )
    {
    case PI.JMP:    Instr = "JMP";   Arg = Dst;  return length;
    case PI.SWAB:   Instr = "SWAB";  Arg = Dst;  return length;
    case PI.MARK:   Instr = "MARK";  Arg = Dst;  return length;
    case PI.SXT:    Instr = "SXT";   Arg = Dst;  return length;
    case PI.MTPS:   Instr = "MTPS";  Arg = Dst;  return length;
    case PI.MFPS:   Instr = "MFPS";  Arg = Dst;  return length;
    }

    var o = ((instr & 32768 /*0100000*/ ) != 0 );

    switch (instr & (~32831) /*0100077*/ )
    {
    case PI.CLR:  Instr = "CLR"+(o?"B":"");  Arg = Dst;  return length;
    case PI.COM:  Instr = "COM"+(o?"B":"");  Arg = Dst;  return length;
    case PI.INC:  Instr = "INC"+(o?"B":"");  Arg = Dst;  return length;
    case PI.DEC:  Instr = "DEC"+(o?"B":"");  Arg = Dst;  return length;
    case PI.NEG:  Instr = "NEG"+(o?"B":"");  Arg = Dst;  return length;
    case PI.ADC:  Instr = "ADC"+(o?"B":"");  Arg = Dst;  return length;
    case PI.SBC:  Instr = "SBC"+(o?"B":"");  Arg = Dst;  return length;
    case PI.TST:  Instr = "TST"+(o?"B":"");  Arg = Dst;  return length;
    case PI.ROR:  Instr = "ROR"+(o?"B":"");  Arg = Dst;  return length;
    case PI.ROL:  Instr = "ROL"+(o?"B":"");  Arg = Dst;  return length;
    case PI.ASR:  Instr = "ASR"+(o?"B":"");  Arg = Dst;  return length;
    case PI.ASL:  Instr = "ASL"+(o?"B":"");  Arg = Dst;  return length;
    }

    length = 1;
	
	var v = instr&0xFF>>>0; if(v&128) v-=256; 
    Dst = OCT( ADDRESS( addr + (v * 2) + 2) );

    // Branches & interrupts
    switch (instr & (~255) /*0377*/ )
    {
    case PI.BR:   Instr = "BR";   Arg = Dst;  return 1;
    case PI.BNE:  Instr = "BNE";  Arg = Dst;  return 1;
    case PI.BEQ:  Instr = "BEQ";  Arg = Dst;  return 1;
    case PI.BGE:  Instr = "BGE";  Arg = Dst;  return 1;
    case PI.BLT:  Instr = "BLT";  Arg = Dst;  return 1;
    case PI.BGT:  Instr = "BGT";  Arg = Dst;  return 1;
    case PI.BLE:  Instr = "BLE";  Arg = Dst;  return 1;
    case PI.BPL:  Instr = "BPL";  Arg = Dst;  return 1;
    case PI.BMI:  Instr = "BMI";  Arg = Dst;  return 1;
    case PI.BHI:  Instr = "BHI";  Arg = Dst;  return 1;
    case PI.BLOS: Instr = "BLOS"; Arg = Dst;  return 1;
    case PI.BVC:  Instr = "BVC";  Arg = Dst;  return 1;
    case PI.BVS:  Instr = "BVS";  Arg = Dst;  return 1;
    case PI.BHIS: Instr = "BHIS"; Arg = Dst;  return 1;
    case PI.BLO:  Instr = "BLO";  Arg = Dst;  return 1;
    }

    Dst = OCT(instr & 255);

    switch (instr & (~255) /*0377*/ )
    {
    case PI.EMT:   Instr = "EMT";   Arg = Dst;  return 1;
    case PI.TRAP:  Instr = "TRAP";  Arg = Dst;  return 1;
    }
	
	var reg = regName[getDigit[instr][2]];

    // Three fields
    switch (instr & (~511) /*0777*/ )
    {
    case PI.JSR:
        if (getDigit[instr][2] == 7)
        {
            Instr = "CALL";
            length += DstStr (instr, ADDRESS(addr+2), m);
            Arg = Dst;
        }
        else
        {
            Instr = "JSR";
            length += DstStr (instr, ADDRESS(addr+2), m);
            Arg = reg + ", " + Dst;
        }
        return length;
    case PI.MUL:
        Instr = "MUL";
        length += DstStr (instr, ADDRESS(addr+2), m);
        Arg =  Dst + ", " + reg
        return length;
    case PI.DIV:
        Instr = "DIV";
        length += DstStr (instr, ADDRESS(addr+2), m);
        Arg = Dst + ", " + reg
        return length;
    case PI.ASH:
        Instr = "ASH";
        length += DstStr (instr, ADDRESS(addr+2), m);
        Arg = Dst + ", " + reg
        return length;
    case PI.ASHC:
        Instr = "ASHC";
        length += DstStr (instr, ADDRESS(addr+2), m);
        Arg = Dst + ", " + reg
        return length;
    case PI.XOR:
        Instr = "XOR";
        length += DstStr (instr, ADDRESS(addr+2), m);
        Arg = reg + ", " + Dst;
        return length;
    case PI.SOB:
        Instr = "SOB";
        Dst = OCT( ADDRESS( addr - (((getDigit[instr][1] * 8) + getDigit[instr][0]) * 2) + 2 ) );
        Arg = reg + ", " + Dst;
        return 1;
    }

    // Four fields

    o = (instr & 32768 /*0100000*/ ) != 0;

    length += SrcStr(instr, ADDRESS(addr+2), m);
    length += DstStr(instr, ADDRESS(addr+2+((length-1)<<1)), memory[length]);

    switch (instr & (~36863) /*0107777*/ )
    {
    case PI.MOV:
        Instr = "MOV"+(o?"B":"");
        Arg = Src + ", " + Dst;
        return length;
    case PI.CMP:
        Instr = "CMP"+(o?"B":"");
        Arg = Src + ", " + Dst;
        return length;
    case PI.BIT:
        Instr = "BIT"+(o?"B":"");
        Arg = Src + ", " + Dst;
        return length;
    case PI.BIC:
        Instr = "BIC"+(o?"B":"");
        Arg = Src + ", " + Dst;
        return length;
    case PI.BIS:
        Instr = "BIS"+(o?"B":"");
        Arg = Src + ", " + Dst;
        return length;
    }

    switch (instr & (~4095) /*0007777*/ )
    {
    case PI.ADD:
        Instr = "ADD";
        Arg = Src + ", " + Dst;
        return length;
    case PI.SUB:
        Instr = "SUB";
        Arg = Src + ", " + Dst;
        return length;
    }

    Instr = "unknown";
    Arg = OCT(instr);
    return 1;
}


return this;
}