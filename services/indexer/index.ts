import { ethers } from 'ethers';
import { Pool } from 'pg';

// Configuration
const NODE_RPC_URL = 'YOUR_NODE_RPC_URL'; // Replace with your RPC URL
const DB_CONNECTION_STRING = 'YOUR_DB_CONNECTION_STRING'; // Replace with your DB connection string

// Connect to the database
const pool = new Pool({
  connectionString: DB_CONNECTION_STRING,
});

// Connect to the blockchain
const provider = new ethers.JsonRpcProvider(NODE_RPC_URL);

// Function to listen for events
async function listenForEvents() {
  console.log('Listening for events...');

  // Replace with your contract address and ABI
  const contractAddress = 'YOUR_CONTRACT_ADDRESS';
  const contractAbi = [/* YOUR_CONTRACT_ABI */];

  const contract = new ethers.Contract(contractAddress, contractAbi, provider);

  contract.on('Swap', (from, to, amountIn, amountOut) => {
    console.log(`Swap event: ${from} -> ${to}, ${amountIn} -> ${amountOut}`);
    // Store the event in the database
    pool.query(
      'INSERT INTO swaps (from_address, to_address, amount_in, amount_out) VALUES ($1, $2, $3, $4)',
      [from, to, amountIn.toString(), amountOut.toString()]
    );
  });

  contract.on('PositionUpdate', (user, collateral, size, price) => {
    console.log(`PositionUpdate event: ${user}, ${collateral}, ${size}, ${price}`);
    // Store the event in the database
    pool.query(
      'INSERT INTO position_updates (user_address, collateral, size, price) VALUES ($1, $2, $3, $4)',
      [user, collateral.toString(), size.toString(), price.toString()]
    );
  });

  // Add listeners for other events (VaultDeposit, FeeCollected, etc.)
}

listenForEvents().catch((error) => {
  console.error('Error listening for events:', error);
});
