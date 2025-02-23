import { config } from "dotenv";
import { ethers } from "ethers";
import solc from "solc";
import chalk from "chalk";
import ora from "ora";
import cfonts from "cfonts";
import readlineSync from "readline-sync";
import fs from "fs";

config();

// Get user inputs
const RPC_URL = readlineSync.question("Enter RPC URL: ");
const PRIVATE_KEY = readlineSync.question("Enter Private Key: ", { hideEchoBack: true });
const CHAIN_ID = readlineSync.question("Enter Chain ID: ");
const CONTRACT_PATH = readlineSync.question("Enter contract source file path/ contoh Greeter.sol : ");

if (!RPC_URL || !PRIVATE_KEY || !CHAIN_ID || !CONTRACT_PATH) {
    console.log(chalk.red.bold("❌ Missing required inputs!"));
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

function loadContractSource() {
    try {
        return fs.readFileSync(CONTRACT_PATH, "utf8");
    } catch (error) {
        console.log(chalk.red.bold("❌ Failed to load contract source!"));
        process.exit(1);
    }
}

function compileContract(source) {
    const spinner = ora("Compiling contract...").start();
    try {
        const input = {
            language: "Solidity",
            sources: { [CONTRACT_PATH]: { content: source } },
            settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } }
        };
        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        const contractName = Object.keys(output.contracts[CONTRACT_PATH])[0];
        const contract = output.contracts[CONTRACT_PATH][contractName];
        spinner.succeed(chalk.green("Contract compiled successfully!"));
        return { abi: contract.abi, bytecode: contract.evm.bytecode.object, contractName };
    } catch (error) {
        spinner.fail(chalk.red("Contract compilation failed!"));
        console.error(error);
        process.exit(1);
    }
}

async function deploy() {
    cfonts.say("NT Exhaust", {
        font: "block",
        align: "center",
        colors: ["cyan", "magenta"],
        background: "black",
        letterSpacing: 1,
        lineHeight: 1,
        space: true,
        maxLength: "0",
    });

    console.log(chalk.blue.bold("=== Instagram : @HamimMihada ==="));
    
    const numDeployments = parseInt(readlineSync.question("Enter number of deployments: "), 10);
    if (isNaN(numDeployments) || numDeployments <= 0) {
        console.log(chalk.red.bold("❌ Invalid number! Please enter a positive number."));
        process.exit(1);
    }
    
    console.log(chalk.blue.bold(`\n🚀 Deploying ${numDeployments} contracts...\n`));

    const contractSourceCode = loadContractSource();
    const { abi, bytecode, contractName } = compileContract(contractSourceCode);
    let contractAddresses = [];

    for (let i = 0; i < numDeployments; i++) {
        const spinner = ora(`Deploying contract ${i + 1}/${numDeployments}...`).start();
        try {
            const factory = new ethers.ContractFactory(abi, bytecode, wallet);
            
            let contract;
            if (abi.some(item => item.type === "constructor" && item.inputs.length > 0)) {
                const constructorArgs = readlineSync.question("Enter constructor arguments (comma-separated, or leave blank if none): ")
                    .split(",")
                    .map(arg => arg.trim());
                contract = await factory.deploy(...constructorArgs);
            } else {
                contract = await factory.deploy();
            }
            
            console.log("⏳ Waiting for transaction confirmation...");
            const txReceipt = await contract.deploymentTransaction().wait();
            
            spinner.succeed(chalk.green(`Contract ${i + 1} deployed successfully!`));
            console.log(chalk.cyan.bold(`📌 Contract Address ${i + 1}: `) + chalk.yellow(contract.target));
            console.log(chalk.cyan.bold(`📜 Transaction Hash ${i + 1}: `) + chalk.yellow(txReceipt.hash));
            
            contractAddresses.push(contract.target);
        } catch (error) {
            spinner.fail(chalk.red(`Deployment ${i + 1} failed!`));
            console.error(error);
        }
    }

    fs.appendFileSync("hasilDeploy.txt", `\nDEPLOYED_CONTRACTS_${CHAIN_ID}=${contractAddresses.join(",")}`);
    console.log(chalk.green("\n✅ All deployments complete! 🎉\n"));
}

deploy().catch(console.error);
