# X Proposer Readme

`x proposer` is a simple script to create a DAO proposal for execution of Arbitrum's L1-to-L2 message passing system (aka "retryable tickets").

It creates arguments to be used in creating a DAO proposal for executing L1 to L2 messaging for ERC20 token transfer on the L2. The L1 Timelock contract send a message to the L2 contract to be executed automatically.

The script demonstrate how to create the proposal to interact with Arbitrum's core bridge contracts to create these retryable messages, how to calculate and forward appropriate fees from L1 to L2, and how to use Arbitrum's L1-to-L2 message [address aliasing](https://developer.offchainlabs.com/docs/l1_l2_messages#address-aliasing).

See [index.js](./scripts/index.js) for inline explanation.

[Click here](https://developer.offchainlabs.com/docs/l1_l2_messages) for more info on retryable tickets.

### Run Script:

```
cd xchain_transfer

yarn install

yarn start
```

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
