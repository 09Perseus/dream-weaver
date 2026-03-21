let encoderInstance: any = null

export async function getEncoder() {
    if (!encoderInstance) {
        const { pipeline } = await import('@xenova/transformers')
        encoderInstance = await pipeline(
            'feature-extraction',
            'Xenova/all-MiniLM-L6-v2',
            { quantized: true }  // ~2MB only
        )
    }
    return encoderInstance
}

export async function encodeQuery(text: string): Promise<number[]> {
    const encoder = await getEncoder()
    const output = await encoder(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
}