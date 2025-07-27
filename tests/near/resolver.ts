import {NearWallet} from './wallet'

export interface CrossChainOrder {
    maker: string
    makingAmount: string
    takingAmount: string
    makerAsset: string
    takerAsset: string
    salt: string
    nonce: string
    srcChainId: number
    dstChainId: number
    srcSafetyDeposit: string
    dstSafetyDeposit: string
    allowPartialFills: boolean
    allowMultipleFills: boolean
}

export interface TimeLocks {
    srcWithdrawal: number
    srcPublicWithdrawal: number
    srcCancellation: number
    srcPublicCancellation: number
    dstWithdrawal: number
    dstPublicWithdrawal: number
    dstCancellation: number
}

export interface EscrowImmutables {
    order: CrossChainOrder
    timeLocks: TimeLocks
    deployedAt: number
    taker: string
    amount: string
}

export class NearResolver {
    constructor(
        private nearWallet: NearWallet,
        private resolverContractId: string,
        private escrowFactoryId: string
    ) {}

    async deploySrc(
        order: CrossChainOrder,
        timeLocks: TimeLocks,
        taker: string,
        amount: string,
        secretHash: string
    ): Promise<any> {
        return await this.nearWallet.functionCall(
            this.resolverContractId,
            'deploy_src',
            {
                order,
                time_locks: timeLocks,
                taker,
                amount,
                secret_hash: secretHash,
            },
            '300000000000000',
            amount // Attach the amount as deposit
        )
    }

    async deployDst(immutables: EscrowImmutables): Promise<any> {
        return await this.nearWallet.functionCall(
            this.resolverContractId,
            'deploy_dst',
            {
                immutables,
            },
            '300000000000000',
            immutables.amount // Attach the amount as deposit
        )
    }

    async withdraw(escrowId: string, secret: string): Promise<any> {
        return await this.nearWallet.functionCall(
            this.resolverContractId,
            'withdraw',
            {
                escrow_id: escrowId,
                secret,
            },
            '200000000000000'
        )
    }

    async cancel(escrowId: string): Promise<any> {
        return await this.nearWallet.functionCall(
            this.resolverContractId,
            'cancel',
            {
                escrow_id: escrowId,
            },
            '200000000000000'
        )
    }

    async getEscrowFactory(): Promise<string> {
        return await this.nearWallet.viewFunction(
            this.resolverContractId,
            'get_escrow_factory'
        )
    }

    async getOwner(): Promise<string> {
        return await this.nearWallet.viewFunction(
            this.resolverContractId,
            'get_owner'
        )
    }
}

export class EthResolver {
    constructor(
        private ethWallet: any,
        private resolverAddress: string
    ) {}

    async deploySrc(
        order: any,
        signature: string,
        amount: string
    ): Promise<any> {
        // Ethereum resolver implementation
        // This would use ethers.js to interact with Ethereum contracts
        return {} // Placeholder
    }

    async deployDst(immutables: any): Promise<any> {
        // Ethereum resolver implementation
        return {} // Placeholder
    }

    async withdraw(escrowAddress: string, secret: string): Promise<any> {
        // Ethereum resolver implementation
        return {} // Placeholder
    }

    async cancel(escrowAddress: string): Promise<any> {
        // Ethereum resolver implementation
        return {} // Placeholder
    }
} 