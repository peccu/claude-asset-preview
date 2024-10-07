import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import neo4j, { Driver } from "neo4j-driver";
import React, { useEffect, useState } from "react";

interface Neo4jConnectionFormProps {
  onConnect: (driver: Driver) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}

export default function Neo4jConnectionForm({
  onConnect,
  onDisconnect,
  isConnected,
}: Neo4jConnectionFormProps) {
  const [neo4jUri, setNeo4jUri] = useState("");
  const [neo4jUser, setNeo4jUser] = useState("");
  const [neo4jPassword, setNeo4jPassword] = useState("");

  useEffect(() => {
    const savedUri = localStorage.getItem("neo4jUri");
    const savedUser = localStorage.getItem("neo4jUser");
    const savedPassword = localStorage.getItem("neo4jPassword");

    if (savedUri) setNeo4jUri(savedUri);
    if (savedUser) setNeo4jUser(savedUser);
    if (savedPassword) setNeo4jPassword(savedPassword);
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const driver = neo4j.driver(
        neo4jUri,
        neo4j.auth.basic(neo4jUser, neo4jPassword),
      );
      await driver.verifyConnectivity();
      onConnect(driver);

      localStorage.setItem("neo4jUri", neo4jUri);
      localStorage.setItem("neo4jUser", neo4jUser);
      localStorage.setItem("neo4jPassword", neo4jPassword);
    } catch (error) {
      console.error("Failed to connect to Neo4j:", error);
      alert(
        "Failed to connect to Neo4j. Please check your connection details.",
      );
    }
  };

  const handleDisconnect = () => {
    onDisconnect();
    localStorage.removeItem("neo4jUri");
    localStorage.removeItem("neo4jUser");
    localStorage.removeItem("neo4jPassword");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neo4j Connection</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <Label htmlFor="neo4jUri">Neo4j URI</Label>
            <Input
              id="neo4jUri"
              value={neo4jUri}
              onChange={(e) => setNeo4jUri(e.target.value)}
              placeholder="bolt://localhost:7687"
              disabled={isConnected}
            />
          </div>
          <div>
            <Label htmlFor="neo4jUser">Username</Label>
            <Input
              id="neo4jUser"
              value={neo4jUser}
              onChange={(e) => setNeo4jUser(e.target.value)}
              placeholder="neo4j"
              disabled={isConnected}
            />
          </div>
          <div>
            <Label htmlFor="neo4jPassword">Password</Label>
            <Input
              id="neo4jPassword"
              type="password"
              value={neo4jPassword}
              onChange={(e) => setNeo4jPassword(e.target.value)}
              placeholder="password"
              disabled={isConnected}
            />
          </div>
          {isConnected ? (
            <Button onClick={handleDisconnect} variant="destructive">
              Disconnect
            </Button>
          ) : (
            <Button type="submit">Connect</Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
