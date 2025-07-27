import 'dotenv/config'
import {expect, jest} from '@jest/globals'
import {randomBytes} from 'crypto'
import {config} from './near/config'
import {NearWallet, EthWallet} from './near/wallet'
import {NearResolver, EthResolver, CrossChainOrder, TimeLocks} from './near/resolver'

jest.setTimeout(1000 * 60 * 5) // 5 minutes timeout

// Test accounts
const ETH_USER_PRIVATE_KEY = config.eth.privateKey
const NEAR_USER_PRIVATE_KEY = config.near.privateKey
const RESOLVER_NEAR_ACCOUNT = 'resolver.testnet'
const RESOLVER_ETH_ADDRESS = '0x...' // Resolver's ETH address

describe('ETH ↔ NEAR Cross-Chain Swap', () => {
    let ethUser: EthWallet
    let nearUser: NearWallet
    let ethResolver: EthResolver
    let nearResolver: NearResolver

    let ethEscrowFactory: string
    let nearEscrowFactory: string
    let ethResolverContract: string
    let nearResolverContract: string

    beforeAll(async () => {
        // Initialize wallets
        ethUser = new EthWallet(ETH_USER_PRIVATE_KEY, config.eth.url)
        nearUser = new NearWallet('user.testnet', NEAR_USER_PRIVATE_KEY)

        // Deploy contracts (in real implementation, these would be deployed)
        ethEscrowFactory = '0x...' // Deployed ETH escrow factory
        nearEscrowFactory = 'escrow-factory.testnet' // Deployed NEAR escrow factory
        ethResolverContract = '0x...' // Deployed ETH resolver
        nearResolverContract = 'resolver.testnet' // Deployed NEAR resolver

        // Initialize resolvers
        ethResolver = new EthResolver(ethUser, ethResolverContract)
        nearResolver = new NearResolver(nearUser, nearResolverContract, nearEscrowFactory)

        // Setup initial balances and approvals
        await setupInitialBalances()
    })

    async function setupInitialBalances() {
        // Setup user balances on both chains
        // In real implementation, this would involve:
        // 1. Getting test tokens from faucets
        // 2. Approving tokens for escrow contracts
        console.log('Setting up initial balances...')
    }

    async function getBalances() {
        const ethBalance = await ethUser.getBalance()
        const nearBalance = await nearUser.getBalance()
        
        return {
            eth: {
                user: ethBalance,
                resolver: '0' // Would get from resolver contract
            },
            near: {
                user: nearBalance,
                resolver: '0' // Would get from resolver contract
            }
        }
    }

    describe('ETH → NEAR Swap', () => {
        it('should swap ETH USDC → NEAR USDC. Single fill only', async () => {
            const initialBalances = await getBalances()

            // Step 1: User creates order
            const secret = randomBytes(32).toString('hex')
            const order: CrossChainOrder = {
                maker: await ethUser.getAddress(),
                makingAmount: '100000000', // 100 USDC (6 decimals)
                takingAmount: '99000000',  // 99 USDC (6 decimals)
                makerAsset: config.eth.tokens.USDC.address,
                takerAsset: config.near.tokens.USDC.address,
                salt: Math.floor(Math.random() * 1000000).toString(),
                nonce: Math.floor(Math.random() * 1000000).toString(),
                srcChainId: config.eth.chainId,
                dstChainId: 1313161554, // NEAR testnet
                srcSafetyDeposit: '1000000000000000', // 0.001 ETH
                dstSafetyDeposit: '1000000000000000000000000', // 1 NEAR
                allowPartialFills: false,
                allowMultipleFills: false
            }

            const timeLocks: TimeLocks = {
                srcWithdrawal: 10,        // 10s finality lock
                srcPublicWithdrawal: 120,  // 2m private withdrawal
                srcCancellation: 121,      // 1s public withdrawal
                srcPublicCancellation: 122, // 1s private cancellation
                dstWithdrawal: 10,         // 10s finality lock
                dstPublicWithdrawal: 100,  // 100s private withdrawal
                dstCancellation: 101       // 1s public withdrawal
            }

            console.log(`[ETH] Creating order for ${order.makingAmount} USDC → ${order.takingAmount} USDC`)

            // Step 2: Resolver fills order on ETH
            console.log(`[ETH] Resolver deploying source escrow`)
            const ethEscrowResult = await ethResolver.deploySrc(
                order,
                'signature_placeholder', // In real implementation, this would be a proper signature
                order.makingAmount
            )

            console.log(`[ETH] Source escrow deployed: ${ethEscrowResult}`)

            // Step 3: Resolver deploys escrow on NEAR
            console.log(`[NEAR] Resolver deploying destination escrow`)
            const nearEscrowResult = await nearResolver.deployDst({
                order,
                timeLocks,
                deployedAt: Date.now(),
                taker: RESOLVER_NEAR_ACCOUNT,
                amount: order.takingAmount
            })

            console.log(`[NEAR] Destination escrow deployed: ${nearEscrowResult}`)

            // Step 4: Wait for time locks
            console.log('Waiting for time locks to pass...')
            await new Promise(resolve => setTimeout(resolve, 11000)) // 11 seconds

            // Step 5: Withdraw funds using secret
            console.log(`[NEAR] Withdrawing funds for user`)
            await nearResolver.withdraw(nearEscrowResult, secret)

            console.log(`[ETH] Withdrawing funds for resolver`)
            await ethResolver.withdraw(ethEscrowResult, secret)

            // Step 6: Verify balances
            const finalBalances = await getBalances()

            console.log('Swap completed successfully!')
            console.log('Initial balances:', initialBalances)
            console.log('Final balances:', finalBalances)

            // Verify the swap worked
            expect(finalBalances.eth.user).toBeLessThan(initialBalances.eth.user)
            expect(finalBalances.near.user).toBeGreaterThan(initialBalances.near.user)
        })

        it('should cancel swap if secret is not shared', async () => {
            const initialBalances = await getBalances()

            // Create order with longer time locks for cancellation test
            const order: CrossChainOrder = {
                maker: await ethUser.getAddress(),
                makingAmount: '50000000', // 50 USDC
                takingAmount: '49500000', // 49.5 USDC
                makerAsset: config.eth.tokens.USDC.address,
                takerAsset: config.near.tokens.USDC.address,
                salt: Math.floor(Math.random() * 1000000).toString(),
                nonce: Math.floor(Math.random() * 1000000).toString(),
                srcChainId: config.eth.chainId,
                dstChainId: 1313161554,
                srcSafetyDeposit: '1000000000000000',
                dstSafetyDeposit: '1000000000000000000000000',
                allowPartialFills: false,
                allowMultipleFills: false
            }

            const timeLocks: TimeLocks = {
                srcWithdrawal: 0,         // No finality lock for cancellation test
                srcPublicWithdrawal: 120,
                srcCancellation: 121,
                srcPublicCancellation: 122,
                dstWithdrawal: 0,         // No finality lock for cancellation test
                dstPublicWithdrawal: 100,
                dstCancellation: 101
            }

            console.log(`[ETH] Creating order for cancellation test`)

            // Deploy escrows
            const ethEscrowResult = await ethResolver.deploySrc(
                order,
                'signature_placeholder',
                order.makingAmount
            )

            const nearEscrowResult = await nearResolver.deployDst({
                order,
                timeLocks,
                deployedAt: Date.now(),
                taker: RESOLVER_NEAR_ACCOUNT,
                amount: order.takingAmount
            })

            // Wait for cancellation time locks
            console.log('Waiting for cancellation time locks...')
            await new Promise(resolve => setTimeout(resolve, 125000)) // 125 seconds

            // Cancel escrows (user doesn't share secret)
            console.log(`[NEAR] Cancelling destination escrow`)
            await nearResolver.cancel(nearEscrowResult)

            console.log(`[ETH] Cancelling source escrow`)
            await ethResolver.cancel(ethEscrowResult)

            const finalBalances = await getBalances()

            // Verify balances are restored
            expect(finalBalances).toEqual(initialBalances)
            console.log('Cancellation completed successfully!')
        })
    })

    describe('NEAR → ETH Swap', () => {
        it('should swap NEAR USDC → ETH USDC. Single fill only', async () => {
            const initialBalances = await getBalances()

            // Create order in reverse direction
            const secret = randomBytes(32).toString('hex')
            const order: CrossChainOrder = {
                maker: await nearUser.getAccountId(),
                makingAmount: '99000000',  // 99 USDC on NEAR
                takingAmount: '100000000', // 100 USDC on ETH
                makerAsset: config.near.tokens.USDC.address,
                takerAsset: config.eth.tokens.USDC.address,
                salt: Math.floor(Math.random() * 1000000).toString(),
                nonce: Math.floor(Math.random() * 1000000).toString(),
                srcChainId: 1313161554, // NEAR testnet
                dstChainId: config.eth.chainId,
                srcSafetyDeposit: '1000000000000000000000000', // 1 NEAR
                dstSafetyDeposit: '1000000000000000', // 0.001 ETH
                allowPartialFills: false,
                allowMultipleFills: false
            }

            const timeLocks: TimeLocks = {
                srcWithdrawal: 10,
                srcPublicWithdrawal: 120,
                srcCancellation: 121,
                srcPublicCancellation: 122,
                dstWithdrawal: 10,
                dstPublicWithdrawal: 100,
                dstCancellation: 101
            }

            console.log(`[NEAR] Creating order for ${order.makingAmount} USDC → ${order.takingAmount} USDC`)

            // Deploy escrows
            const nearEscrowResult = await nearResolver.deploySrc(
                order,
                timeLocks,
                RESOLVER_NEAR_ACCOUNT,
                order.makingAmount,
                secret
            )

            const ethEscrowResult = await ethResolver.deployDst({
                order,
                timeLocks,
                deployedAt: Date.now(),
                taker: RESOLVER_ETH_ADDRESS,
                amount: order.takingAmount
            })

            // Wait for time locks
            await new Promise(resolve => setTimeout(resolve, 11000))

            // Withdraw funds
            await ethResolver.withdraw(ethEscrowResult, secret)
            await nearResolver.withdraw(nearEscrowResult, secret)

            const finalBalances = await getBalances()

            // Verify the swap worked
            expect(finalBalances.near.user).toBeLessThan(initialBalances.near.user)
            expect(finalBalances.eth.user).toBeGreaterThan(initialBalances.eth.user)

            console.log('NEAR → ETH swap completed successfully!')
        })
    })
}) 