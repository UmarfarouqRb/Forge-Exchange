
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Staking: React.FC = () => {
  const [pools, setPools] = useState([
    {
      pool: 'ETH-USDC',
      tvl: '142300',
      apr: 18.5,
      rewards: 'FORGE',
    },
    {
      pool: 'BTC-USDC',
      tvl: '250000',
      apr: 15.2,
      rewards: 'FORGE',
    },
  ]);

  const [myPositions, setMyPositions] = useState([
    {
      pool: 'ETH-USDC',
      deposited: '1000',
      rewards: '50',
    },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Staking</h1>
          <p className="mt-4 text-lg text-muted-foreground">Stake your assets and earn rewards.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Pools</h2>
            <div className="space-y-4">
              {pools.map((pool, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{pool.pool}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-muted-foreground">TVL</p>
                        <p>${pool.tvl}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">APR</p>
                        <p>{pool.apr}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rewards</p>
                        <p>{pool.rewards}</p>
                      </div>
                    </div>
                    <Button className="mt-4 w-full">Deposit</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">My Positions</h2>
            <div className="space-y-4">
              {myPositions.map((position, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{position.pool}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-muted-foreground">Deposited</p>
                        <p>${position.deposited}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rewards</p>
                        <p>{position.rewards} FORGE</p>
                      </div>
                    </div>
                    <Button className="mt-4 w-full">Withdraw</Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Deposit</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="token" className="block text-sm font-medium text-muted-foreground">Token</label>
                      <Input id="token" placeholder="ETH" />
                    </div>
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground">Amount</label>
                      <Input id="amount" placeholder="0.0" />
                    </div>
                    <Button className="w-full">Approve</Button>
                    <Button className="w-full">Stake</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Staking;
