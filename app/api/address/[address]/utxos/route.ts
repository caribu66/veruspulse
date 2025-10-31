import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required',
        },
        { status: 400 }
      );
    }

    // Get UTXOs for the address
    const utxos = await verusAPI.getAddressUTXOs(address);

    // Ensure utxos is an array
    if (!utxos || !Array.isArray(utxos) || utxos.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get additional details for each UTXO
    const detailedUtxos = await Promise.allSettled(
      utxos.map(async (utxo: any) => {
        try {
          // Get the transaction to get script details
          const tx = await verusAPI.getRawTransaction(utxo.txid, true);
          const output = tx?.vout?.[utxo.vout];

          return {
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.satoshis || utxo.value || 0,
            scriptPubKey: {
              addresses: output?.scriptPubKey?.addresses || [],
              type: output?.scriptPubKey?.type || 'unknown',
            },
            confirmations: utxo.confirmations || 0,
          };
        } catch (error) {
          console.error(
            `Error processing UTXO ${utxo.txid}:${utxo.vout}:`,
            error
          );
          return {
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.satoshis || utxo.value || 0,
            scriptPubKey: {
              addresses: [],
              type: 'unknown',
            },
            confirmations: utxo.confirmations || 0,
          };
        }
      })
    );

    const validUtxos = detailedUtxos
      .filter((result: any) => result.status === 'fulfilled')
      .map((result: any) => result.value);

    return NextResponse.json({
      success: true,
      data: validUtxos,
    });
  } catch (error) {
    console.error('Error fetching address UTXOs:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch address UTXOs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
