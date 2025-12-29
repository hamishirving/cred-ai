"use client";

import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TableNode } from "./table-node";
import { DomainGroup } from "./domain-group";
import { useSchemaToErd } from "./use-schema-to-erd";
import { erdConfig } from "./erd-config";

const nodeTypes = {
  tableNode: TableNode,
  domainGroup: DomainGroup,
};

export function ErdCanvas() {
  const { nodes: initialNodes, edges: initialEdges } = useSchemaToErd();

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // MiniMap node color based on domain
  const nodeColor = useCallback((node: any) => {
    const domain = node.data?.domain as string | undefined;
    if (domain && domain in erdConfig.domains) {
      return erdConfig.domains[domain as keyof typeof erdConfig.domains].color;
    }
    return "#6b7280";
  }, []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls
          className="!bg-card !border-border !rounded-lg !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!fill-foreground [&>button:hover]:!bg-muted"
          style={{ left: 10, bottom: 50 }}
        />
        <MiniMap
          nodeColor={nodeColor}
          maskColor="rgba(0,0,0,0.1)"
          className="!bg-card !border-border !rounded-lg"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
