const { providers, Wallet } = require('ethers')
const ethers = require('ethers')
const {
  L1ToL2MessageGasEstimator,
} = require('@arbitrum/sdk/dist/lib/message/L1ToL2MessageGasEstimator')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const {
  L1TransactionReceipt,
  L1ToL2MessageStatus,
  EthBridger,
  getL2Network,
  addDefaultLocalNetwork,
} = require('@arbitrum/sdk')
const { getBaseFee } = require('@arbitrum/sdk/dist/lib/utils/lib')
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])
const ERC20_ABI = require('./abi.json')
const INBOX_ABI = require('./inbox-abi.json')

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

const main = async () => {
  await arbLog("Cross-chain Proposer");

  addDefaultLocalNetwork();

  const l2Network = await getL2Network(l2Provider);
  const ethBridger = new EthBridger(l2Network);
  const inboxAddress = ethBridger.l2Network.ethBridge.inbox;
  const ARBTokenAddressOnL2 = "0x912CE59144191C1204E64559FE8253a0e49E6548"; // ARB TOKEN ADDRESS ON ARBITRUM ONE
  const grantsContractAddress = "0x00d5e0d31d37cc13c645d86410ab4cb7cb428cca";
  const L2Alias = "0x28ffDfB0A6e6E06E95B3A1f928Dc4024240bD87c"; // Timelock Alias Address on L2
  const description =
    "# Test Transaction before 7k ARB Transfer To Fund Unlock Protocol’s Ecosystem via Grants Stack  This proposal requests to use 1 ARB from the tokens given to Unlock Protocol DAO by ArbitrumDAO to run a test transaction to de-risk the transfer of 7k ARB tokens to fund the retroQF round on Grants Stack.";
  console.log("INBOX ADDRESS:::::", inboxAddress);

  const L2TokenContract = new ethers.Contract(
    ARBTokenAddressOnL2,
    ERC20_ABI.abi,
    l2Wallet
  ).connect(l2Wallet);

  const inboxContract = new ethers.Contract(
    inboxAddress,
    INBOX_ABI.abi,
    l1Provider
  ).connect(l1Wallet);

  const balanceOf = await L2TokenContract.balanceOf(L2Alias);
  console.log("ARB BALANCE::", ethers.utils.formatEther(await balanceOf));

  const tokenAmount = ethers.utils.parseEther("1");

  // Create an instance of the Interface from the ABIs
  const iface_erc20 = new ethers.utils.Interface(ERC20_ABI.abi);
  const iface_inbox = new ethers.utils.Interface(INBOX_ABI.abi);

  // Encode the ERC20 Token transfer calldata
  const calldata = iface_erc20.encodeFunctionData("transfer", [
    grantsContractAddress,
    tokenAmount,
  ]);

  console.log("TRANSFER CALLDATA:::", calldata);

  /**
   * Now we can query the required gas params using the estimateAll method in Arbitrum SDK
   */
  const l1ToL2MessageGasEstimate = new L1ToL2MessageGasEstimator(l2Provider);

  /**
   * The estimateAll method gives us the following values for sending an L1->L2 message
   * (1) maxSubmissionCost: The maximum cost to be paid for submitting the transaction
   * (2) gasLimit: The L2 gas limit
   * (3) deposit: The total amount to deposit on L1 to cover L2 gas and L2 call value
   */
  const L1TimelockContract = "0x17eedfb0a6e6e06e95b3a1f928dc4024240bc76b";
  const L1ToL2MessageGasParams = await l1ToL2MessageGasEstimate.estimateAll(
    {
      from: L1TimelockContract,
      to: ARBTokenAddressOnL2,
      l2CallValue: 0,
      excessFeeRefundAddress: l2Wallet.address,
      callValueRefundAddress: l2Wallet.address,
      data: calldata,
    },
    await getBaseFee(l1Provider),
    l1Provider
  );
  console.log(":::::::::L1ToL2MessageGasParams::::::::::");
  console.log(
    "GasParams::::gasLimit",
    L1ToL2MessageGasParams.gasLimit.toNumber()
  );
  console.log(
    "GasParams::::maxSubmissionCost",
    L1ToL2MessageGasParams.maxSubmissionCost.toNumber()
  );
  console.log(
    "GasParams::::maxGas",
    L1ToL2MessageGasParams.maxFeePerGas.toNumber()
  );
  console.log(
    "GasParams::::deposit",
    L1ToL2MessageGasParams.deposit.toNumber()
  );

  console.log(
    `Current retryable base submission price is: ${L1ToL2MessageGasParams.maxSubmissionCost.toString()}`
  );

  const gasPriceBid = await l2Provider.getGasPrice();
  console.log(`L2 gas price: ${gasPriceBid.toString()}`);

  const calldata2 = iface_inbox.encodeFunctionData("createRetryableTicket", [
    ARBTokenAddressOnL2,
    0,
    L1ToL2MessageGasParams.maxSubmissionCost,
    l2Wallet.address,
    l2Wallet.address,
    L1ToL2MessageGasParams.gasLimit,
    gasPriceBid,
    calldata,
  ]);
  console.log("INBOX CALLDATA:::", calldata2);

  // Proposal PARAMS i.e Call Governor.propose() with these values
  // targets: Inbox contract
  // values: depost * 10
  // description
  const targets = [inboxAddress];
  const values = [L1ToL2MessageGasParams.deposit.toNumber() * 10]; // I Multiply by 10 to add extra in case gas changes
  const calldatas = [calldata2];
  console.log("______________________________________________________________________\n");
  console.log("PROPOSAL ARGS - Call Propose function on Governor with the following::");
  console.log("______________________________________________________________________\n");

  console.log("TARGETS:: ", targets);
  console.log("VALUES:: ", values);
  console.log("CALLDATAS:: ", calldatas);
  console.log("DESCRIPTION:: ", description);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
