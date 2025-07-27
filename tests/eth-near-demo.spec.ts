import 'dotenv/config'
import {expect, jest} from '@jest/globals'
import {randomBytes} from 'crypto'

jest.setTimeout(1000 * 60 * 5) // 5 minutes timeout

// Mock implementations for demonstration
class MockNearWallet {
    constructor(private accountId: string) {}
    
    async getAccountId(): Promise<string> {
        return this.accountId
    }
    
    async getBalance(): Promise<string> {
        return '1000000000000000000000000' // 1 NEAR
    }
    
    async functionCall(contractId: string, methodName: string, args: any): Promise<any> {
        console.log(`[NEAR] Calling ${contractId}.${methodName} with args:`, args)
        return { transactionHash: 'mock-near-tx-hash' }
    }
}

class MockEthWallet {
    constructor(private address: string) {}
    
    async getAddress(): Promise<string> {
        return this.address
    }
    
    async getBalance(): Promise<string> {
        return '1000000000000000000' // 1 ETH
    }
    
    async sendTransaction(transaction: any): Promise<any> {
        console.log(`[ETH] Sending transaction:`, transaction)
        return { hash: 'mock-eth-tx-hash' }
    }
}

class MockNearResolver {
    constructor(private nearWallet: MockNearWallet) {}
    
    async deploySrc(order: any, timeLocks: any, taker: string, amount: string, secretHash: string): Promise<any> {
        console.log(`[NEAR] Deploying source escrow for ${amount} tokens`)
        return await this.nearWallet.functionCall('escrow-factory.testnet', 'create_src_escrow', {
            order,
            time_locks: timeLocks,
            taker,
            amount,
            secret_hash: secretHash
        })
    }
    
    async deployDst(immutables: any): Promise<any> {
        console.log(`[NEAR] Deploying destination escrow for ${immutables.amount} tokens`)
        return await this.nearWallet.functionCall('escrow-factory.testnet', 'create_dst_escrow', {
            immutables
        })
    }
    
    async withdraw(escrowId: string, secret: string): Promise<any> {
        console.log(`[NEAR] Withdrawing from escrow ${escrowId} using secret`)
        return await this.nearWallet.functionCall(escrowId, 'withdraw', { secret })
    }
    
    async cancel(escrowId: string): Promise<any> {
        console.log(`[NEAR] Cancelling escrow ${escrowId}`)
        return await this.nearWallet.functionCall(escrowId, 'cancel', {})
    }
}

class MockEthResolver {
    constructor(private ethWallet: MockEthWallet) {}
    
    async deploySrc(order: any, signature: string, amount: string): Promise<any> {
        console.log(`[ETH] Deploying source escrow for ${amount} tokens`)
        return await this.ethWallet.sendTransaction({
            to: '0xResolverContract',
            data: '0xdeploy_src',
            value: amount
        })
    }
    
    async deployDst(immutables: any): Promise<any> {
        console.log(`[ETH] Deploying destination escrow for ${immutables.amount} tokens`)
        return await this.ethWallet.sendTransaction({
            to: '0xResolverContract',
            data: '0xdeploy_dst',
            value: immutables.amount
        })
    }
    
    async withdraw(escrowAddress: string, secret: string): Promise<any> {
        console.log(`[ETH] Withdrawing from escrow ${escrowAddress} using secret`)
        return await this.ethWallet.sendTransaction({
            to: escrowAddress,
            data: '0xwithdraw',
            value: '0'
        })
    }
    
    async cancel(escrowAddress: string): Promise<any> {
        console.log(`[ETH] Cancelling escrow ${escrowAddress}`)
        return await this.ethWallet.sendTransaction({
            to: escrowAddress,
            data: '0xcancel',
            value: '0'
        })
    }
}

describe('ETH ↔ NEAR Cross-Chain Swap Demo', () => {
    let ethUser: MockEthWallet
    let nearUser: MockNearWallet
    let ethResolver: MockEthResolver
    let nearResolver: MockNearResolver

    beforeAll(async () => {
        // Initialize mock wallets
        ethUser = new MockEthWallet('0xUserAddress')
        nearUser = new MockNearWallet('user.testnet')
        
        // Initialize mock resolvers
        ethResolver = new MockEthResolver(ethUser)
        nearResolver = new MockNearResolver(nearUser)
    })

    describe('ETH → NEAR Swap Demo', () => {
        it('should demonstrate ETH USDC → NEAR USDC swap flow', async () => {
            console.log('\n🚀 Starting ETH → NEAR Cross-Chain Swap Demo')
            
            // Step 1: User creates order
            const secret = randomBytes(32).toString('hex')
            const order = {
                maker: await ethUser.getAddress(),
                makingAmount: '100000000', // 100 USDC (6 decimals)
                takingAmount: '99000000',  // 99 USDC (6 decimals)
                makerAsset: '0xUSDC_ETH',
                takerAsset: 'usdc.near',
                salt: Math.floor(Math.random() * 1000000).toString(),
                nonce: Math.floor(Math.random() * 1000000).toString(),
                srcChainId: 1, // Ethereum
                dstChainId: 1313161554, // NEAR testnet
                srcSafetyDeposit: '1000000000000000', // 0.001 ETH
                dstSafetyDeposit: '1000000000000000000000000', // 1 NEAR
                allowPartialFills: false,
                allowMultipleFills: false
            }

            const timeLocks = {
                srcWithdrawal: 10,        // 10s finality lock
                srcPublicWithdrawal: 120,  // 2m private withdrawal
                srcCancellation: 121,      // 1s public withdrawal
                srcPublicCancellation: 122, // 1s private cancellation
                dstWithdrawal: 10,         // 10s finality lock
                dstPublicWithdrawal: 100,  // 100s private withdrawal
                dstCancellation: 101       // 1s public withdrawal
            }

            console.log(`\n📋 Order Created:`)
            console.log(`   Maker: ${order.maker}`)
            console.log(`   Making: ${order.makingAmount} USDC on ETH`)
            console.log(`   Taking: ${order.takingAmount} USDC on NEAR`)
            console.log(`   Secret: ${secret.substring(0, 16)}...`)

            // Step 2: Resolver fills order on ETH
            console.log(`\n🔒 Step 1: Deploying Source Escrow on ETH`)
            const ethEscrowResult = await ethResolver.deploySrc(
                order,
                'signature_placeholder',
                order.makingAmount
            )
            console.log(`   ✅ ETH Escrow deployed: ${ethEscrowResult.hash}`)

            // Step 3: Resolver deploys escrow on NEAR
            console.log(`\n🔒 Step 2: Deploying Destination Escrow on NEAR`)
            const nearEscrowResult = await nearResolver.deployDst({
                order,
                timeLocks,
                deployedAt: Date.now(),
                taker: 'resolver.testnet',
                amount: order.takingAmount
            })
            console.log(`   ✅ NEAR Escrow deployed: ${nearEscrowResult.transactionHash}`)

            // Step 4: Wait for time locks
            console.log(`\n⏰ Step 3: Waiting for time locks to pass...`)
            await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate 1 second wait
            console.log(`   ✅ Time locks passed`)

            // Step 5: Withdraw funds using secret
            console.log(`\n💰 Step 4: Withdrawing funds using shared secret`)
            console.log(`   🔓 Withdrawing from NEAR escrow for user`)
            await nearResolver.withdraw(nearEscrowResult.transactionHash, secret)
            
            console.log(`   🔓 Withdrawing from ETH escrow for resolver`)
            await ethResolver.withdraw(ethEscrowResult.hash, secret)

            // Step 6: Verify completion
            console.log(`\n✅ Step 5: Swap completed successfully!`)
            console.log(`   📊 User: -${order.makingAmount} USDC on ETH, +${order.takingAmount} USDC on NEAR`)
            console.log(`   📊 Resolver: +${order.makingAmount} USDC on ETH, -${order.takingAmount} USDC on NEAR`)
            
            // Verify the flow worked
            expect(ethEscrowResult.hash).toBeDefined()
            expect(nearEscrowResult.transactionHash).toBeDefined()
            expect(secret).toHaveLength(64) // 32 bytes = 64 hex chars
            
            console.log(`\n🎉 ETH → NEAR Cross-Chain Swap Demo Completed Successfully!`)
        })

        it('should demonstrate cancellation flow', async () => {
            console.log('\n🚫 Starting Cancellation Demo')
            
            const secret = randomBytes(32).toString('hex')
            const order = {
                maker: await ethUser.getAddress(),
                makingAmount: '50000000', // 50 USDC
                takingAmount: '49500000', // 49.5 USDC
                makerAsset: '0xUSDC_ETH',
                takerAsset: 'usdc.near',
                salt: Math.floor(Math.random() * 1000000).toString(),
                nonce: Math.floor(Math.random() * 1000000).toString(),
                srcChainId: 1,
                dstChainId: 1313161554,
                srcSafetyDeposit: '1000000000000000',
                dstSafetyDeposit: '1000000000000000000000000',
                allowPartialFills: false,
                allowMultipleFills: false
            }

            const timeLocks = {
                srcWithdrawal: 0,         // No finality lock for cancellation test
                srcPublicWithdrawal: 120,
                srcCancellation: 121,
                srcPublicCancellation: 122,
                dstWithdrawal: 0,         // No finality lock for cancellation test
                dstPublicWithdrawal: 100,
                dstCancellation: 101
            }

            console.log(`\n📋 Order Created for Cancellation Test`)

            // Deploy escrows
            const ethEscrowResult = await ethResolver.deploySrc(order, 'signature', order.makingAmount)
            const nearEscrowResult = await nearResolver.deployDst({
                order,
                timeLocks,
                deployedAt: Date.now(),
                taker: 'resolver.testnet',
                amount: order.takingAmount
            })

            console.log(`\n⏰ Waiting for cancellation time locks...`)
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Cancel escrows (user doesn't share secret)
            console.log(`\n❌ Cancelling escrows (user doesn't share secret)`)
            await nearResolver.cancel(nearEscrowResult.transactionHash)
            await ethResolver.cancel(ethEscrowResult.hash)

            console.log(`\n✅ Cancellation completed successfully!`)
            console.log(`   💰 Funds returned to original owners`)

            expect(ethEscrowResult.hash).toBeDefined()
            expect(nearEscrowResult.transactionHash).toBeDefined()
        })
    })

    describe('NEAR → ETH Swap Demo', () => {
        it('should demonstrate NEAR USDC → ETH USDC swap flow', async () => {
            console.log('\n🚀 Starting NEAR → ETH Cross-Chain Swap Demo')
            
            const secret = randomBytes(32).toString('hex')
            const order = {
                maker: await nearUser.getAccountId(),
                makingAmount: '99000000',  // 99 USDC on NEAR
                takingAmount: '100000000', // 100 USDC on ETH
                makerAsset: 'usdc.near',
                takerAsset: '0xUSDC_ETH',
                salt: Math.floor(Math.random() * 1000000).toString(),
                nonce: Math.floor(Math.random() * 1000000).toString(),
                srcChainId: 1313161554, // NEAR testnet
                dstChainId: 1, // Ethereum
                srcSafetyDeposit: '1000000000000000000000000', // 1 NEAR
                dstSafetyDeposit: '1000000000000000', // 0.001 ETH
                allowPartialFills: false,
                allowMultipleFills: false
            }

            const timeLocks = {
                srcWithdrawal: 10,
                srcPublicWithdrawal: 120,
                srcCancellation: 121,
                srcPublicCancellation: 122,
                dstWithdrawal: 10,
                dstPublicWithdrawal: 100,
                dstCancellation: 101
            }

            console.log(`\n📋 Order Created:`)
            console.log(`   Maker: ${order.maker}`)
            console.log(`   Making: ${order.makingAmount} USDC on NEAR`)
            console.log(`   Taking: ${order.takingAmount} USDC on ETH`)

            // Deploy escrows
            console.log(`\n🔒 Deploying escrows on both chains`)
            const nearEscrowResult = await nearResolver.deploySrc(order, timeLocks, 'resolver.testnet', order.makingAmount, secret)
            const ethEscrowResult = await ethResolver.deployDst({
                order,
                timeLocks,
                deployedAt: Date.now(),
                taker: '0xResolverAddress',
                amount: order.takingAmount
            })

            console.log(`\n⏰ Waiting for time locks...`)
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Withdraw funds
            console.log(`\n💰 Withdrawing funds`)
            await ethResolver.withdraw(ethEscrowResult.hash, secret)
            await nearResolver.withdraw(nearEscrowResult.transactionHash, secret)

            console.log(`\n✅ NEAR → ETH swap completed successfully!`)
            console.log(`   📊 User: -${order.makingAmount} USDC on NEAR, +${order.takingAmount} USDC on ETH`)
            console.log(`   📊 Resolver: +${order.makingAmount} USDC on NEAR, -${order.takingAmount} USDC on ETH`)

            expect(nearEscrowResult.transactionHash).toBeDefined()
            expect(ethEscrowResult.hash).toBeDefined()
        })
    })
}) 