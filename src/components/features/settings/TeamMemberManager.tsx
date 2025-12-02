'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users } from 'lucide-react'

interface TeamMember {
  id: string
  role: string
  created_at: string
  user?: {
    email?: string
    raw_user_meta_data?: {
      full_name?: string
    }
  }
}

interface TeamMemberManagerProps {
  teamMembers: TeamMember[]
  inviteEmail: string
  setInviteEmail: (email: string) => void
  inviteRole: string
  setInviteRole: (role: string) => void
  isInviting: boolean
  isSaving: boolean
  onInvite: () => void
  onUpdateRole: (memberId: string, newRole: string) => void
  onRemove: (memberId: string) => void
}

export function TeamMemberManager({
  teamMembers,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  isInviting,
  isSaving,
  onInvite,
  onUpdateRole,
  onRemove,
}: TeamMemberManagerProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Invite team members and manage their roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite New Member */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold">Invite Team Member</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-40">
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="sales">Sales Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={onInvite}
                disabled={isInviting || !inviteEmail}
                className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white whitespace-nowrap"
              >
                {isInviting ? 'Inviting...' : 'Send Invite'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Team members will receive an email invitation to join your company
            </p>
          </div>

          {/* Current Team Members */}
          <div className="space-y-4">
            <h3 className="font-bold">Current Team Members</h3>
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No team members yet</p>
                <p className="text-sm">Invite your first team member to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {member.user?.raw_user_meta_data?.full_name || member.user?.email}
                      </p>
                      <p className="text-sm text-gray-500">{member.user?.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(newRole) => onUpdateRole(member.id, newRole)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-purple-500">Admin</Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="sales">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500">Sales</Badge>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRemove(member.id)}
                        disabled={isSaving}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role Permissions Info */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-bold">Role Permissions</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-500">Admin</Badge>
                </div>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Full access to settings</li>
                  <li>• Manage team members</li>
                  <li>• Edit company profile</li>
                  <li>• Manage pricing & products</li>
                  <li>• Create & edit quotes</li>
                  <li>• Manage subscription</li>
                </ul>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-500">Sales Team</Badge>
                </div>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Create new quotes</li>
                  <li>• Edit existing quotes</li>
                  <li>• Send quotes to customers</li>
                  <li>• View all company quotes</li>
                  <li className="text-gray-400">• No access to settings</li>
                  <li className="text-gray-400">• Cannot manage team</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
