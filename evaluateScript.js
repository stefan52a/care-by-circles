//just for fun:

// const { deserializeTransaction, disassembleBytecodeBCH, hexToBin, instantiateVirtualMachineBCH, OpcodesBCH, stringify } = require('bitcoin-ts');
const bts = require('bitcoin-ts');
async function main () 
{
    const getTx = async (url) => { const r = (await require('got')(`https://rest.bitcoin.com/v2/rawtransactions/getRawTransaction/${url}`)).body; return r.slice(1, r.length-1); }
    
    // From the first Bitcoin Cash block:
    const spending = await getTx('dff40f79cef322369d1d7ab9dc20f71a75dd333dc30eb2d77c08dafdbd1a7e86');
    // we'll check the validity of it's first input:
    const inputIndex = 0;
    // which was funded by this transaction:
    const source = await getTx('fe479efb8092139bf32e04c33816eb416b8d8982e7a7b5b2430c25aa1ada1ca8');
    
    // ð evaluate
    
    const vm = await bts.instantiateVirtualMachineBCH();
    
    // deserialize each transaction into simple objects:
    const sourceTransaction = bts.decodeTransaction(bts.hexToBin(source));
    const spendingTransaction = bts.decodeTransaction(bts.hexToBin(spending));
    
    // select the proper output from the source transaction:
    const sourceOutput = sourceTransaction.outputs[spendingTransaction.inputs[inputIndex].outpointIndex];
    
    // this is everything we need to check this input for validity:
    const program = { inputIndex, sourceOutput, spendingTransaction };
    
    // fully evaluate the program, returning a snapshot of the final VM state:
    const result = vm.evaluate(program);
    
    // ð verify
    
    // the final VM state will show us things like error messages, remaining
    // stack items, and other details, but if we just want a boolean:
    console.log(vm.verify(vm.evaluate(program)) ? 'ð success' : 'â failure');
    
    // ð¥ debug
    
    // we can also use `debug` to get a step-by-step trace of each VM state:
    const trace = vm.debug(program);
    
     // for example, let's print out the opcode and stack at each step:
    var pretty = ""
    for (var i=0; i<trace.length; i++)
        state=trace[i]
       if (state.instructions[state.ip - 1])
       {pretty+=`\n${i}: ${bts.OpcodesBCH[state.instructions[state.ip - 1].opcode]}\n${bts.stringify(state.stack)}`;
       }
    
    console.log(`spending transaction:\n${bts.stringify(spendingTransaction)}\n`);
    console.log(`unlocking bytecode:\n${bts.disassembleBytecodeBCH(spendingTransaction.inputs[inputIndex].unlockingBytecode)}\n\nlocking bytecode:\n${bts.disassembleBytecodeBCH(sourceOutput.lockingBytecode)}\n`);
    console.log(`final state:\n${bts.stringify(result)}\n`);
    console.log(`debug trace: ${pretty}`);
}


main()