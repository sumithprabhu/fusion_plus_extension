import {z} from 'zod'
import * as process from 'node:process'

const bool = z
    .string()
    .transform((v) => v.toLowerCase() === 'true')
    .pipe(z.boolean())

const ConfigSchema = z.object({
    ETH_RPC_URL: z.string().url(),
    NEAR_RPC_URL: z.string().url(),
    NEAR_NETWORK_ID: z.string().default('testnet'),
    NEAR_MASTER_ACCOUNT: z.string(),
    NEAR_PRIVATE_KEY: z.string(),
    ETH_PRIVATE_KEY: z.string(),
})

const fromEnv = ConfigSchema.parse(process.env)

export const config = {
    eth: {
        chainId: 11155111, // Sepolia testnet
        url: fromEnv.ETH_RPC_URL,
        privateKey: fromEnv.ETH_PRIVATE_KEY,
        tokens: {
            USDC: {
                address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
                decimals: 6
            }
        }
    },
    near: {
        networkId: fromEnv.NEAR_NETWORK_ID,
        rpcUrl: fromEnv.NEAR_RPC_URL,
        masterAccount: fromEnv.NEAR_MASTER_ACCOUNT,
        privateKey: fromEnv.NEAR_PRIVATE_KEY,
        tokens: {
            USDC: {
                address: 'usdc.fakes.testnet', // NEAR testnet USDC
                decimals: 6
            }
        }
    }
} as const

export type EthConfig = typeof config.eth
export type NearConfig = typeof config.near 