import mongoose, { Schema, Document } from 'mongoose';

export interface INetwork extends Document {
    id: string;
    name: string;
    type?: string;            // e.g., 'ERC-20', 'BEP-20', 'TRC-20'
    rpcUrl: string;
    explorer: string;         // NEW: Block Explorer URL
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const NetworkSchema = new Schema<INetwork>({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        default: 'Native'
    },
    rpcUrl: {
        type: String,
        required: true
    },

    // ⭐ NEW FIELD ADDED  
    explorer: {
        type: String,
        required: true        // you can change to false if optional
    },

    status: {
        type: String,
        default: 'active'
    }
}, {
    timestamps: true
});

const Network = mongoose.model<INetwork>('Network', NetworkSchema);

export default Network;
