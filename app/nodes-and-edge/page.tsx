"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";
import { Driver } from "neo4j-driver";
import React, { useState } from "react";
import Neo4jConnectionForm from "./Neo4jConnectionForm";

// 型定義
type NodeType = string;
type EdgeType = string;
type NodeValue = string;
type EdgeValue = string;

type MockNodes = Record<NodeType, NodeValue[]>;
type MockEdges = Record<EdgeType, EdgeValue[]>;

// Initial mock data
const initialNodeTypes: NodeType[] = ["Person", "Location", "Event", "Object"];
const initialEdgeTypes: EdgeType[] = [
  "Friendship",
  "Ownership",
  "Participation",
  "Located_In",
];

const initialMockNodes: MockNodes = {
  Person: ["Alice", "Bob", "Charlie", "David", "Eve"],
  Location: ["New York", "Tokyo", "London", "Paris", "Sydney"],
  Event: ["Conference", "Concert", "Meeting", "Workshop", "Exhibition"],
  Object: ["Book", "Car", "Phone", "Computer", "Desk"],
};

const initialMockEdges: MockEdges = {
  Friendship: [
    "Close Friend",
    "Acquaintance",
    "Best Friend",
    "Colleague",
    "Classmate",
  ],
  Ownership: [
    "Owner",
    "Co-owner",
    "Previous Owner",
    "Temporary Owner",
    "Shared Owner",
  ],
  Participation: ["Organizer", "Attendee", "Speaker", "Volunteer", "Sponsor"],
  Located_In: [
    "Permanent",
    "Temporary",
    "Birthplace",
    "Workplace",
    "Vacation Spot",
  ],
};

interface MultiSelectDropdownProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  onCreateNew: (newItems: string[]) => void;
  isBulkMode: boolean;
}

function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder,
  onCreateNew,
  isBulkMode,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleCreateNew = () => {
    const newItems = inputValue
      .split("\n")
      .filter((item) => item.trim() !== "");
    onCreateNew(newItems);
    onChange(isBulkMode ? [...value, ...newItems] : [newItems[0]]);
    setOpen(false);
    setInputValue("");
  };

  const handleToggle = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((i) => i !== item));
    } else {
      onChange([...value, item]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {value.length > 0
            ? isBulkMode
              ? `${value.length} selected`
              : value.join(", ")
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            onValueChange={setInputValue}
          />
          <CommandEmpty>
            No {placeholder.toLowerCase()} found.
            <Textarea
              placeholder={`Enter new ${placeholder.toLowerCase()}(s), one per line`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="mt-2"
            />
            <Button
              variant="ghost"
              className="w-full justify-start mt-2"
              onClick={handleCreateNew}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create new {placeholder.toLowerCase()}(s)
            </Button>
          </CommandEmpty>
          <CommandGroup>
            <CommandList>
              {options.map((option: string) => (
                <CommandItem
                  key={option}
                  onSelect={() =>
                    isBulkMode ? handleToggle(option) : onChange([option])
                  }
                >
                  {isBulkMode && (
                    <Checkbox
                      checked={value.includes(option)}
                      className="mr-2"
                    />
                  )}
                  {option}
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function NodeEdgeRelationUI() {
  const [isConnected, setIsConnected] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);

  const handleConnect = (newDriver: Driver) => {
    setDriver(newDriver);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    if (driver) {
      driver.close();
    }
    setDriver(null);
    setIsConnected(false);
  };

  const fetchDataFromNeo4j = async (neo4jDriver: Driver) => {
    const session = neo4jDriver.session();
    try {
      // Fetch node types
      const nodeTypesResult = await session.run("CALL db.labels()");
      const fetchedNodeTypes = nodeTypesResult.records.map((record) =>
        record.get(0),
      );
      setNodeTypes(fetchedNodeTypes);

      // Fetch edge types
      const edgeTypesResult = await session.run("CALL db.relationshipTypes()");
      const fetchedEdgeTypes = edgeTypesResult.records.map((record) =>
        record.get(0),
      );
      setEdgeTypes(fetchedEdgeTypes);

      // Fetch nodes for each type
      const fetchedMockNodes: MockNodes = {};
      for (const nodeType of fetchedNodeTypes) {
        const nodesResult = await session.run(
          `MATCH (n:${nodeType}) RETURN n.name AS name`,
        );
        fetchedMockNodes[nodeType] = nodesResult.records.map((record) =>
          record.get("name"),
        );
      }
      setMockNodes(fetchedMockNodes);

      // Fetch edges for each type
      const fetchedMockEdges: MockEdges = {};
      for (const edgeType of fetchedEdgeTypes) {
        const edgesResult = await session.run(
          `MATCH ()-[r:${edgeType}]->() RETURN DISTINCT type(r) AS type`,
        );
        fetchedMockEdges[edgeType] = edgesResult.records.map((record) =>
          record.get("type"),
        );
      }
      setMockEdges(fetchedMockEdges);
    } catch (error) {
      console.error("Error fetching data from Neo4j:", error);
    } finally {
      await session.close();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) {
      alert("Please connect to Neo4j first.");
      return;
    }
    const session = driver.session();
    try {
      for (const nodeAValue of nodeA) {
        for (const nodeBValue of nodeB) {
          for (const edgeValue of edge) {
            await session.run(
              `
              MERGE (a:${nodeTypeA[0]} {name: $nodeAValue})
              MERGE (b:${nodeTypeB[0]} {name: $nodeBValue})
              MERGE (a)-[r:${edgeType[0]} {type: $edgeValue}]->(b)
              RETURN a, r, b
              `,
              { nodeAValue, nodeBValue, edgeValue },
            );
          }
        }
      }
      console.log("Relation(s) created successfully");
      await fetchDataFromNeo4j(driver);
    } catch (error) {
      console.error("Error creating relation in Neo4j:", error);
      alert(
        "Failed to create relation. Please check your input and try again.",
      );
    } finally {
      await session.close();
    }
  };

  const [nodeTypes, setNodeTypes] = useState<NodeType[]>(initialNodeTypes);
  const [edgeTypes, setEdgeTypes] = useState<EdgeType[]>(initialEdgeTypes);
  const [mockNodes, setMockNodes] = useState<MockNodes>(initialMockNodes);
  const [mockEdges, setMockEdges] = useState<MockEdges>(initialMockEdges);

  const [nodeTypeA, setNodeTypeA] = useState<NodeType[]>([]);
  const [nodeA, setNodeA] = useState<NodeValue[]>([]);
  const [nodeTypeB, setNodeTypeB] = useState<NodeType[]>([]);
  const [nodeB, setNodeB] = useState<NodeValue[]>([]);
  const [edgeType, setEdgeType] = useState<EdgeType[]>([]);
  const [edge, setEdge] = useState<EdgeValue[]>([]);

  const [isBulkMode, setIsBulkMode] = useState(false);

  const handleCreateNewNodeType = (newTypes: NodeType[]) => {
    setNodeTypes((prev) => [...prev, ...newTypes]);
    setMockNodes((prev) => {
      const newMockNodes = { ...prev };
      newTypes.forEach((type) => {
        if (!newMockNodes[type]) {
          newMockNodes[type] = [];
        }
      });
      return newMockNodes;
    });
  };

  const handleCreateNewEdgeType = (newTypes: EdgeType[]) => {
    setEdgeTypes((prev) => [...prev, ...newTypes]);
    setMockEdges((prev) => {
      const newMockEdges = { ...prev };
      newTypes.forEach((type) => {
        if (!newMockEdges[type]) {
          newMockEdges[type] = [];
        }
      });
      return newMockEdges;
    });
  };

  const handleCreateNewNode = (newNodes: NodeValue[]) => {
    if (nodeTypeA.length > 0) {
      setMockNodes((prev) => ({
        ...prev,
        [nodeTypeA[0]]: [...(prev[nodeTypeA[0]] || []), ...newNodes],
      }));
    }
  };

  const handleCreateNewEdge = (newEdges: EdgeValue[]) => {
    if (edgeType.length > 0) {
      setMockEdges((prev) => ({
        ...prev,
        [edgeType[0]]: [...(prev[edgeType[0]] || []), ...newEdges],
      }));
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto p-4">
      <Neo4jConnectionForm
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isConnected={isConnected}
      />

      {isConnected && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Create Node-Edge Relation
                <div className="flex items-center space-x-2">
                  <Switch
                    id="bulk-mode"
                    checked={isBulkMode}
                    onCheckedChange={setIsBulkMode}
                  />
                  <label htmlFor="bulk-mode" className="text-sm font-medium">
                    Bulk Edit Mode
                  </label>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Node A Group */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Node A</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <MultiSelectDropdown
                      options={nodeTypes}
                      value={nodeTypeA}
                      onChange={setNodeTypeA}
                      placeholder="Select type"
                      onCreateNew={handleCreateNewNodeType}
                      isBulkMode={isBulkMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Node
                    </label>
                    <MultiSelectDropdown
                      options={
                        nodeTypeA.length > 0
                          ? mockNodes[nodeTypeA[0]] || []
                          : []
                      }
                      value={nodeA}
                      onChange={setNodeA}
                      placeholder="Select node"
                      onCreateNew={handleCreateNewNode}
                      isBulkMode={isBulkMode}
                    />
                  </div>
                </div>
              </div>

              {/* Edge Group */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Edge</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <MultiSelectDropdown
                      options={edgeTypes}
                      value={edgeType}
                      onChange={setEdgeType}
                      placeholder="Select type"
                      onCreateNew={handleCreateNewEdgeType}
                      isBulkMode={isBulkMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Edge
                    </label>
                    <MultiSelectDropdown
                      options={
                        edgeType.length > 0 ? mockEdges[edgeType[0]] || [] : []
                      }
                      value={edge}
                      onChange={setEdge}
                      placeholder="Select edge"
                      onCreateNew={handleCreateNewEdge}
                      isBulkMode={isBulkMode}
                    />
                  </div>
                </div>
              </div>

              {/* Node B Group */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Node B</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <MultiSelectDropdown
                      options={nodeTypes}
                      value={nodeTypeB}
                      onChange={setNodeTypeB}
                      placeholder="Select type"
                      onCreateNew={handleCreateNewNodeType}
                      isBulkMode={isBulkMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Node
                    </label>
                    <MultiSelectDropdown
                      options={
                        nodeTypeB.length > 0
                          ? mockNodes[nodeTypeB[0]] || []
                          : []
                      }
                      value={nodeB}
                      onChange={setNodeB}
                      placeholder="Select node"
                      onCreateNew={handleCreateNewNode}
                      isBulkMode={isBulkMode}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">
                Create Relation{isBulkMode ? "s" : ""}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
